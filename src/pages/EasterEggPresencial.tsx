import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Loader2, Egg, ArrowLeft, MapPin, QrCode } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";
import { Html5Qrcode } from "html5-qrcode";

const EasterEggPresencial = () => {
  const { profile, addPoints, completeMission, session } = useUser();
  const navigate = useNavigate();
  const [mission, setMission] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [validating, setValidating] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [easterEggValue, setEasterEggValue] = useState(500);
  const [showPass, setShowPass] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const load = async () => {
      const [missionRes, valueRes] = await Promise.all([
        supabase.from("missions").select("*").eq("slug", "easter-egg-presencial").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "easter_egg_presencial_value").maybeSingle(),
      ]);

      if (missionRes.data) setMission(missionRes.data);
      if (valueRes.data) setEasterEggValue(Number(valueRes.data.value));

      if (session?.user && missionRes.data) {
        const { data: existing } = await supabase
          .from("user_missions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("mission_id", missionRes.data.id)
          .maybeSingle();
        if (existing) {
          setIsCompleted(true);
          setEarnedPoints(Number(valueRes.data?.value || missionRes.data.points));
        }
      }
    };
    load();

    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }
    };
  }, [session]);

  const startScanner = async () => {
    setScanning(true);
    setScannerReady(false);
    await new Promise((r) => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode("easter-qr-reader");
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
    if (!mission || !session?.user || !profile || isCompleted) return;
    setValidating(true);

    let payload: { id?: string; prize?: string; value?: number } | null = null;
    try {
      payload = JSON.parse(code);
    } catch {
      setValidating(false);
      toast({ title: "QR Code inválido", description: "O QR Code escaneado não é válido.", variant: "destructive" });
      return;
    }

    if (!payload || payload.id !== "easter-egg-presencial") {
      setValidating(false);
      toast({ title: "QR Code inválido", description: "Este não é o QR Code do Easter Egg.", variant: "destructive" });
      return;
    }

    const { data: existing } = await supabase
      .from("user_missions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("mission_id", mission.id)
      .maybeSingle();

    if (existing) {
      setValidating(false);
      setIsCompleted(true);
      toast({ title: "Já resgatado", description: "Você já resgatou este prêmio.", variant: "destructive" });
      return;
    }

    const { data: currentValue } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "easter_egg_presencial_value")
      .maybeSingle();

    const points = currentValue ? Number(currentValue.value) : easterEggValue;

    await completeMission(mission.id);
    await addPoints(points, "mission", mission.id);

    setIsCompleted(true);
    setEarnedPoints(points);
    setShowPass(false);
    setValidating(false);
    fireConfetti();
    toast({
      title: "🎉 Parabéns! Você encontrou o Easter Egg!",
      description: `Você ganhou +${points} pontos!`,
    });
  };

  if (!profile || !mission) return null;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-24">
        <button onClick={() => navigate("/missions")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Easter Egg – Presencial</h1>
        <p className="text-sky-600 text-sm font-medium mb-6">Encontre o QR Code escondido no stand!</p>

        {isCompleted ? (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mb-4"
            >
              <Egg size={48} className="text-white" />
            </motion.div>
            <h2 className="font-bold text-foreground text-xl mb-2">Easter Egg Encontrado! 🎉</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">
              Você encontrou o Easter Egg e ganhou pontos bônus.
            </p>
            <div className="p-4 rounded-2xl bg-card shadow-card text-center">
              <p className="text-xs text-muted-foreground">Missão concluída</p>
              <p className="text-primary font-bold text-lg">✅ +{(earnedPoints ?? easterEggValue).toLocaleString("pt-BR")} pts</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-5 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 shadow-card mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Egg size={16} className="text-sky-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Easter Egg</span>
                <span className="text-[10px] text-muted-foreground">📍 Stand Presencial</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">+{easterEggValue} Pontos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Encontre o QR Code escondido no stand e escaneie para ganhar pontos bônus!
              </p>
              <button
                onClick={() => setShowPass(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold text-sm shadow-md"
              >
                <QrCode size={14} />
                Escanear QR Code
              </button>
            </motion.div>

            <div className="w-full p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                💡 Dica: Procure pelo QR Code escondido no stand. Aponte a câmera para escanear.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── SCANNER MODAL (drawer) ── */}
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

            {/* Blue header */}
            <div className="bg-gradient-to-br from-sky-400 via-blue-500 to-sky-600 px-6 pt-10 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sky-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                    VTEX Day 2026 · Stand Presencial
                  </p>
                  <h2 className="text-white text-2xl font-extrabold">Easter Egg</h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Egg size={24} className="text-white" />
                </div>
              </div>

              <div className="flex gap-8 mt-5">
                <div>
                  <p className="text-sky-200 text-[10px] font-bold uppercase tracking-wider">Caçador</p>
                  <p className="text-white font-bold text-sm">{profile.name.split(" ")[0]}</p>
                </div>
                <div>
                  <p className="text-sky-200 text-[10px] font-bold uppercase tracking-wider">Prêmio</p>
                  <p className="text-white font-bold text-sm">+{easterEggValue} Pontos</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="bg-card px-6 py-5 space-y-4 pb-10">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200">
                <MapPin size={18} className="text-sky-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-foreground text-sm">Encontre o QR Code no stand</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Procure pelo QR Code escondido no stand e escaneie para ganhar pontos bônus!
                  </p>
                </div>
              </div>

              {validating ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 size={32} className="animate-spin text-sky-500" />
                  <p className="text-sm text-muted-foreground font-medium">Validando QR Code...</p>
                </div>
              ) : !scanning ? (
                <button
                  onClick={startScanner}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
                >
                  <QrCode size={18} />
                  Escanear QR Code
                </button>
              ) : (
                <div>
                  <div className="relative rounded-2xl overflow-hidden bg-black mb-3">
                    <div id="easter-qr-reader" className="w-full" />
                  </div>
                  {!scannerReady && (
                    <p className="text-center text-sm text-muted-foreground">Iniciando câmera...</p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    Aponte a câmera para o QR Code do Easter Egg
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

export default EasterEggPresencial;
