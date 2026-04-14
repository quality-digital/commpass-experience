import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useAvatars, findAvatarBySlug, type Avatar } from "@/hooks/useAvatars";
import { supabase } from "@/integrations/supabase/client";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "@/hooks/use-toast";

const OnboardingComplete = () => {
  const navigate = useNavigate();
  const { profile, session, loading, refreshProfile } = useUser();
  const { data: avatars = [], isLoading: loadingAvatars } = useAvatars();
  const [easterEggPoints, setEasterEggPoints] = useState(0);
  const [recoveringProfile, setRecoveringProfile] = useState(false);
  const [onboardingContent, setOnboardingContent] = useState<Record<string, string>>({});

  const [easterEgg] = useState(() => {
    const flag = sessionStorage.getItem("easter_egg_unlocked");
    if (flag) sessionStorage.removeItem("easter_egg_unlocked");
    return flag === "true";
  });

  const [savedAvatar] = useState<Avatar | null>(() => {
    const raw = sessionStorage.getItem("onboarding_avatar");
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  });

  const [savedPoints] = useState(() => {
    const raw = sessionStorage.getItem("onboarding_points");
    if (raw) {
      return parseInt(raw, 10);
    }
    return null;
  });

  const [displayPoints, setDisplayPoints] = useState<number | null>(savedPoints);

  // Load onboarding content from app_settings
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["onboarding_title", "onboarding_subtitle", "onboarding_message"])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d) => (map[d.key] = d.value));
          setOnboardingContent(map);
        }
      });
  }, []);

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

  // Poll for updated points if we have 0 points but expect more
  useEffect(() => {
    if (!session?.user?.id) return;
    // If we already have points from sessionStorage or profile, skip
    if ((displayPoints && displayPoints > 0) || (profile && profile.points > 0)) {
      if (profile && profile.points > 0) {
        setDisplayPoints(profile.points);
        sessionStorage.setItem("onboarding_points", String(profile.points));
      }
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        const { data } = await supabase
          .from("profiles")
          .select("points")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (data?.points && data.points > 0) {
          setDisplayPoints(data.points);
          sessionStorage.setItem("onboarding_points", String(data.points));
          await refreshProfile();
          return;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [session?.user?.id, profile?.points, displayPoints, refreshProfile]);

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

  if (!session?.user) return null;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-12 bg-background text-center">
        <h1 className="text-2xl font-bold text-foreground">Cadastro concluído</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Sua conta foi criada, mas ainda estamos sincronizando seu perfil. Você pode seguir para a home ou entrar novamente.</p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button onClick={() => navigate("/home", { replace: true })} className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button">Ir para Home</button>
          <button onClick={() => navigate("/login", { replace: true })} className="w-full py-4 rounded-2xl bg-secondary text-foreground font-semibold">Fazer login</button>
        </div>
      </div>
    );
  }

  // Priority: DB avatar (if avatars loaded) → savedAvatar from sessionStorage → inline fallback
  const dbAvatar = avatars.length > 0 ? findAvatarBySlug(avatars, profile.avatar_id) : null;
  const avatar = dbAvatar || savedAvatar;
  const firstName = profile.name?.trim()?.split(" ")[0] || "participante";
  const title = onboardingContent.onboarding_title || "Cadastro Concluído!";
  const subtitle = onboardingContent.onboarding_subtitle || "Você está a bordo!";
  const message = (onboardingContent.onboarding_message || "Bem-vindo(a) ao Comm Pass, {name}!").replace("{name}", firstName);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-primary font-semibold text-sm mb-2">Bem-vindo à jornada</p>
        <h1 className="text-3xl font-extrabold text-foreground mb-6">{title}</h1>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-5xl shadow-card mb-4 overflow-hidden`}
      >
        {avatar?.image_url ? (
          <img src={avatar.image_url} alt={avatar?.name || "Avatar"} className="w-full h-full object-cover" />
        ) : (
          <span className="leading-none">{avatar?.emoji || profile.avatar_emoji || "👤"}</span>
        )}
      </motion.div>

      {avatar && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm font-semibold text-foreground mb-1">
          {avatar.name}
        </motion.p>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">{subtitle}</h2>
        <p className="text-muted-foreground text-sm">{message}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="w-full max-w-xs p-6 rounded-2xl bg-card shadow-card text-center mb-6">
        <p className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Pontos Iniciais</p>
        <p className="text-4xl font-extrabold text-primary mb-1">{(displayPoints || profile.points || 0).toLocaleString("pt-BR")}</p>
        <p className="text-muted-foreground text-sm">pontos conquistados</p>
      </motion.div>

      {easterEgg && avatar && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="w-full max-w-xs p-5 rounded-2xl border-2 border-green-300 bg-green-50 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-lg overflow-hidden`}>
              {avatar.image_url ? (
                <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover" />
              ) : (
                avatar.emoji
              )}
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
              <span className="text-sm">{avatar.emoji}</span>
              <span className="text-sm font-semibold text-foreground">{avatar.name} — Avatar Premiado</span>
            </div>
            <span className="text-green-600 font-bold text-sm">+{easterEggPoints.toLocaleString("pt-BR")} pts</span>
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
