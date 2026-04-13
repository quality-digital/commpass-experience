import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, X, Award, Star, MapPin, QrCode, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";
import { Html5Qrcode } from "html5-qrcode";

type QrPayload = {
  id: string;
  email: string;
  value: number;
  prize?: string;
};

const GoldenPass = () => {
  const { profile, addPoints, completeMission, getCompletedMissions, session } = useUser();
  const [minPoints, setMinPoints] = useState(400);
  const [goldenPassMission, setGoldenPassMission] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [validating, setValidating] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "golden_pass_min_points")
        .maybeSingle();
      if (setting) setMinPoints(Number(setting.value));

      const { data: mission } = await supabase
        .from("missions")
        .select("*")
        .eq("slug", "golden-pass")
        .maybeSingle();
      if (mission) setGoldenPassMission(mission);

      const completedIds = await getCompletedMissions();
      if (mission && completedIds.includes(mission.id)) {
        setIsCompleted(true);
        // Fetch the actual redeemed value
        if (session?.user) {
          const { data: redemption } = await supabase
            .from("golden_pass_redemptions")
            .select("value")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (redemption) setEarnedPoints(redemption.value);
        }
      }
    };
    load();
  }, []);

  const parseQrPayload = (raw: string): QrPayload | null => {
    try {
      const data = JSON.parse(raw);
      if (!data.id || !data.email || typeof data.value !== "number") return null;
      return data as QrPayload;
    } catch {
      return null;
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setScannerReady(false);
    await new Promise((r) => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          await handleQrScanned(decodedText);
        },
        () => {}
      );
      setScannerReady(true);
    } catch {
      setScanning(false);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQrScanned = async (code: string) => {
    if (!goldenPassMission || !session?.user || !profile || isCompleted) return;

    setValidating(true);

    // 1. Parse & validate JSON
    const payload = parseQrPayload(code);
    if (!payload) {
      setValidating(false);
      toast({ title: "QR Code inválido", description: "O QR Code escaneado não é válido.", variant: "destructive" });
      return;
    }

    const qrPoints: number = payload.value;
    console.log(`[GoldenPass] QR scanned — id: ${payload.id}, value: ${qrPoints}, email: ${payload.email}`);

    // 2. Check email matches logged-in user
    if (payload.email.toLowerCase() !== profile.email.toLowerCase()) {
      setValidating(false);
      toast({ title: "Usuário incorreto", description: "Este QR Code não pertence a este usuário.", variant: "destructive" });
      return;
    }

    // 3. Check if QR already used in golden_pass_redemptions
    const { data: existing } = await supabase
      .from("golden_pass_redemptions")
      .select("id")
      .eq("qr_id", payload.id)
      .maybeSingle();

    if (existing) {
      setValidating(false);
      toast({ title: "QR Code já utilizado", description: "Este QR Code já foi utilizado.", variant: "destructive" });
      return;
    }

    // 3b. Check if QR came from roulette and mark as redeemed
    const { data: rouletteSpin } = await supabase
      .from("roulette_spins")
      .select("id, status, qr_id")
      .eq("qr_id", payload.id)
      .maybeSingle();

    if (rouletteSpin) {
      if (rouletteSpin.status === "redeemed") {
        setValidating(false);
        toast({ title: "QR Code já utilizado", description: "Este QR Code da roleta já foi resgatado.", variant: "destructive" });
        return;
      }
      // Mark roulette spin as redeemed
      await supabase
        .from("roulette_spins")
        .update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemed_by: session.user.id })
        .eq("id", rouletteSpin.id);
    }

    // 4. Insert redemption record
    const { error: insertError } = await supabase.from("golden_pass_redemptions").insert({
      qr_id: payload.id,
      user_id: session.user.id,
      email: profile.email,
      value: qrPoints,
      prize: payload.prize || null,
    });

    if (insertError) {
      setValidating(false);
      if (insertError.code === "23505") {
        toast({ title: "QR Code já utilizado", description: "Este QR Code já foi utilizado.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao resgatar", description: "Tente novamente.", variant: "destructive" });
      }
      return;
    }

    // 5. Add points + complete mission
    console.log(`[GoldenPass] Adding exactly ${qrPoints} points to user ${session.user.id}`);
    await addPoints(qrPoints);
    await completeMission(goldenPassMission.id);
    setIsCompleted(true);
    setEarnedPoints(qrPoints);
    setShowPass(false);
    setValidating(false);
    fireConfetti();
    toast({
      title: "🏆 Golden Pass Resgatado!",
      description: `Você ganhou +${qrPoints} pontos!`,
    });
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  if (!profile) return null;

  const isUnlocked = profile.points >= minPoints;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-1">Golden Pass</h1>
        <p className="text-primary text-sm font-medium mb-6">Sua chance de girar a roleta da sorte!</p>

        {!isUnlocked ? (
          /* ── LOCKED STATE ── */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">Golden Pass Bloqueado</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">
              Acumule pelo menos {minPoints} pontos para desbloquear o Golden Pass
            </p>
            <div className="w-full max-w-xs p-3 rounded-xl bg-card shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{profile.points} / {minPoints} pts</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                  style={{ width: `${Math.min((profile.points / minPoints) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

        ) : isCompleted ? (
          /* ── COMPLETED STATE ── */
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4"
            >
              <Award size={48} className="text-white" />
            </motion.div>
            <h2 className="font-bold text-foreground text-xl mb-2">Golden Pass Resgatado! 🎉</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">
              Você já resgatou seu Golden Pass e girou a roleta da sorte.
            </p>
            <div className="p-4 rounded-2xl bg-card shadow-card text-center">
              <p className="text-xs text-muted-foreground">Missão concluída</p>
              <p className="text-primary font-bold text-lg">✅ +{earnedPoints ?? 0} pts</p>
            </div>
          </div>

        ) : (
          /* ── UNLOCKED – SHOW CARD ── */
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-card mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Golden Pass</span>
                <span className="text-[10px] text-muted-foreground">📍 Estação Commerce</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">Roleta da Sorte</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Seu Golden Pass está pronto! Apresente presencialmente na Estação Commerce para girar a roleta e ganhar brindes.
              </p>
              <button
                onClick={() => setShowPass(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-md"
              >
                <QrCode size={14} />
                Ver Passe
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* ── GOLDEN PASS MODAL (drawer) ── */}
      {showPass && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!scanning && !validating) setShowPass(false); }} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/40 z-10" />
            <button
              onClick={() => { if (!scanning && !validating) { stopScanner(); setShowPass(false); } }}
              className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center z-10"
            >
              <X size={16} className="text-white" />
            </button>

            {/* Golden header */}
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 px-6 pt-10 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                    VTEX Day 2026 · Estação Commerce
                  </p>
                  <h2 className="text-white text-2xl font-extrabold">Golden Pass</h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star size={24} className="text-white" />
                </div>
              </div>

              <div className="flex gap-8 mt-5">
                <div>
                  <p className="text-amber-200 text-[10px] font-bold uppercase tracking-wider">Portador</p>
                  <p className="text-white font-bold text-sm">{profile.name.split(" ")[0]}</p>
                </div>
                <div>
                  <p className="text-amber-200 text-[10px] font-bold uppercase tracking-wider">Acesso</p>
                  <p className="text-white font-bold text-sm">Roleta da Sorte</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="bg-card px-6 py-5 space-y-4 pb-10">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <MapPin size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-foreground text-sm">Apresente presencialmente no estande</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostre este passe dourado para a equipe Jitterbit + Quality Digital na Estação Commerce e gire a roleta para ganhar bônus e brindes!
                  </p>
                </div>
              </div>

              {validating ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 size={32} className="animate-spin text-amber-500" />
                  <p className="text-sm text-muted-foreground font-medium">Validando QR Code...</p>
                </div>
              ) : !scanning ? (
                <button
                  onClick={startScanner}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
                >
                  <QrCode size={18} />
                  Escanear QR no Estande
                </button>
              ) : (
                <div>
                  <div className="relative rounded-2xl overflow-hidden bg-black mb-3">
                    <div id="qr-reader" className="w-full" />
                  </div>
                  {!scannerReady && (
                    <p className="text-center text-sm text-muted-foreground">Iniciando câmera...</p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    Aponte a câmera para o QR Code da roleta
                  </p>
                  <button
                    onClick={stopScanner}
                    className="w-full mt-3 py-3 rounded-xl border border-border text-muted-foreground font-semibold text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
};

export default GoldenPass;
