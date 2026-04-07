import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Camera, X, Award } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";
import { Html5Qrcode } from "html5-qrcode";

const GoldenPass = () => {
  const { profile, addPoints, completeMission, getCompletedMissions, session } = useUser();
  const navigate = useNavigate();
  const [minPoints, setMinPoints] = useState(400);
  const [goldenPassMission, setGoldenPassMission] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const load = async () => {
      // Load min points setting
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "golden_pass_min_points")
        .single();
      if (setting) setMinPoints(Number(setting.value));

      // Load golden pass mission
      const { data: mission } = await supabase
        .from("missions")
        .select("*")
        .eq("slug", "golden-pass")
        .single();
      if (mission) setGoldenPassMission(mission);

      // Check if already completed
      const completedIds = await getCompletedMissions();
      if (mission && completedIds.includes(mission.id)) {
        setIsCompleted(true);
      }
    };
    load();
  }, []);

  const startScanner = async () => {
    setScanning(true);
    setScannerReady(false);

    // Wait for DOM element to exist
    await new Promise((r) => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // QR code scanned successfully
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          await handleQrScanned(decodedText);
        },
        () => {
          // ignore scan errors
        }
      );
      setScannerReady(true);
    } catch (err: any) {
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
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQrScanned = async (code: string) => {
    if (!goldenPassMission || !session?.user || isCompleted) return;

    // Extract points from QR code (format: "GOLDENPASS:100" or just accept any valid QR)
    let points = goldenPassMission.points;
    const match = code.match(/^GOLDENPASS:(\d+)$/i);
    if (match) {
      points = Number(match[1]);
    }

    await addPoints(points);
    await completeMission(goldenPassMission.id);
    setIsCompleted(true);
    fireConfetti();
    toast({
      title: "🏆 Golden Pass Resgatado!",
      description: `+${points} pontos da roleta da sorte!`,
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  if (!profile) return null;

  const isUnlocked = profile.points >= minPoints;

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Golden Pass</h1>
        <p className="text-primary text-sm font-medium mb-6">Sua chance de girar a roleta da sorte!</p>

        {!isUnlocked ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">Golden Pass Bloqueado</h2>
            <p className="text-muted-foreground text-sm text-center">
              Acumule pelo menos {minPoints} pontos para desbloquear o Golden Pass
            </p>
            <p className="text-primary font-bold text-sm mt-2">{profile.points}/{minPoints} pontos</p>

            <div className="w-full max-w-xs mt-6">
              <div className="w-full h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full gradient-primary transition-all"
                  style={{ width: `${Math.min((profile.points / minPoints) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4"
            >
              <Award size={48} className="text-primary-foreground" />
            </motion.div>
            <h2 className="font-bold text-foreground text-xl mb-2">Golden Pass Resgatado! 🎉</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">
              Você já resgatou seu Golden Pass e girou a roleta da sorte.
            </p>
            <div className="p-4 rounded-2xl bg-card shadow-card text-center">
              <p className="text-xs text-muted-foreground">Missão concluída</p>
              <p className="text-primary font-bold text-lg">✅ +{goldenPassMission?.points || 200} pts</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Award size={24} className="text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Golden Pass Desbloqueado!</h3>
                  <p className="text-xs text-muted-foreground">Apresente no estande para jogar</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Vá até o <strong>Estande Principal</strong> e apresente este Golden Pass. 
                Gire a roleta da sorte e escaneie o QR Code para receber seus pontos!
              </p>
              <div className="p-3 rounded-xl bg-white border border-amber-200 text-center">
                <p className="text-xs text-muted-foreground mb-1">Recompensa</p>
                <p className="text-2xl font-extrabold text-amber-600">+{goldenPassMission?.points || 200} pts</p>
              </div>
            </motion.div>

            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                Escanear QR Code da Roleta
              </button>
            ) : (
              <div className="w-full">
                <div className="relative rounded-2xl overflow-hidden bg-black mb-4">
                  <div id="qr-reader" className="w-full" />
                  <button
                    onClick={stopScanner}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-foreground/50 flex items-center justify-center z-10"
                  >
                    <X size={20} className="text-primary-foreground" />
                  </button>
                </div>
                {!scannerReady && (
                  <p className="text-center text-sm text-muted-foreground">Iniciando câmera...</p>
                )}
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Aponte a câmera para o QR Code da roleta
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default GoldenPass;
