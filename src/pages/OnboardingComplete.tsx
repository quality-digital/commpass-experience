import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "@/hooks/use-toast";

const OnboardingComplete = () => {
  const navigate = useNavigate();
  const { profile, session, loading, refreshProfile } = useUser();
  const [easterEggPoints, setEasterEggPoints] = useState(0);
  const [recoveringProfile, setRecoveringProfile] = useState(false);
  const [easterEgg] = useState(() => {
    const flag = sessionStorage.getItem("easter_egg_unlocked");
    if (flag) sessionStorage.removeItem("easter_egg_unlocked");
    return flag === "true";
  });

  // Keep avatar info from sessionStorage as fallback for refresh scenarios
  const [savedAvatar] = useState(() => {
    const raw = sessionStorage.getItem("onboarding_avatar");
    if (raw) return JSON.parse(raw);
    return null;
  });

  const [savedPoints] = useState(() => {
    const raw = sessionStorage.getItem("onboarding_points");
    if (raw) {
      sessionStorage.removeItem("onboarding_points");
      return parseInt(raw, 10);
    }
    return null;
  });

  useEffect(() => {
    if (easterEgg) {
      setTimeout(() => fireConfetti(), 600);
      supabase
        .from("missions")
        .select("points")
        .eq("slug", "easter-egg-avatar")
        .single()
        .then(({ data }) => {
          if (data) setEasterEggPoints(data.points);
        });
    }
  }, [easterEgg]);

  useEffect(() => {
    if (profile?.avatar_id) {
      const av = AVATARS.find((a) => a.id === profile.avatar_id);
      if (av) {
        sessionStorage.setItem("onboarding_avatar", JSON.stringify(av));
      }
    }
  }, [profile?.avatar_id]);

  useEffect(() => {
    if (!loading && session?.user && !profile && !recoveringProfile) {
      setRecoveringProfile(true);
      refreshProfile()
        .catch((error) => {
          console.error("[OnboardingComplete] Erro ao recuperar perfil", error);
          toast({ title: "Erro ao finalizar cadastro", description: "Não foi possível carregar seus dados agora.", variant: "destructive" });
        })
        .finally(() => setRecoveringProfile(false));
    }
  }, [loading, profile, recoveringProfile, refreshProfile, session?.user]);

  useEffect(() => {
    if (!loading && !session?.user) {
      console.error("[OnboardingComplete] Sessão ausente ao abrir a tela final do cadastro");
      toast({ title: "Sessão não encontrada", description: "Faça login novamente para continuar.", variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [loading, navigate, session?.user]);

  if (loading || recoveringProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Finalizando seu cadastro...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-12 bg-background text-center">
        <h1 className="text-2xl font-bold text-foreground">Cadastro concluído</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Sua conta foi criada, mas ainda estamos sincronizando seu perfil. Você pode seguir para a home ou entrar novamente.</p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button"
          >
            Ir para Home
          </button>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-4 rounded-2xl bg-secondary text-foreground font-semibold"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  const avatar = AVATARS.find((a) => a.id === profile.avatar_id) || savedAvatar;
  const firstName = profile.name?.trim()?.split(" ")[0] || "participante";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-primary font-semibold text-sm mb-2">Bem-vindo à jornada</p>
        <h1 className="text-3xl font-extrabold text-foreground mb-6">Cadastro Concluído!</h1>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-5xl shadow-card mb-4`}
      >
        {avatar?.emoji || profile.avatar_emoji || "👤"}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Você está a bordo!</h2>
        <p className="text-muted-foreground text-sm">Bem-vindo(a) ao VTEX Day, {firstName}!</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="w-full max-w-xs p-6 rounded-2xl bg-card shadow-card text-center mb-6">
        <p className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Pontos Iniciais</p>
        <p className="text-4xl font-extrabold text-primary mb-1">{profile.points || savedPoints || 0}</p>
        <p className="text-muted-foreground text-sm">pontos conquistados</p>
      </motion.div>

      {easterEgg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="w-full max-w-xs p-5 rounded-2xl border-2 border-green-300 bg-green-50 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-lg`}>
              {avatar?.emoji || "🛒"}
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-200 text-green-800 mb-1">
                Easter Egg
              </span>
              <p className="font-bold text-foreground text-sm">Missão Secreta Desbloqueada!</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Você escolheu o avatar premiado e desbloqueou a missão <strong>Easter Egg — App</strong> automaticamente. 🎉
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">{avatar?.emoji || "🛒"}</span>
              <span className="text-sm font-semibold text-foreground">{avatar?.name || "Shopper"} — Avatar Premiado</span>
            </div>
            <span className="text-green-600 font-bold text-sm">+{easterEggPoints} pts</span>
          </div>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: easterEgg ? 1.0 : 0.8 }}
        onClick={() => {
          sessionStorage.removeItem("onboarding_avatar");
          sessionStorage.removeItem("onboarding_points");
          navigate("/home", { replace: true });
        }}
        className="w-full max-w-xs py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button flex items-center justify-center gap-2"
      >
        🚀 Iniciar Jornada
      </motion.button>
    </div>
  );
};

export default OnboardingComplete;
