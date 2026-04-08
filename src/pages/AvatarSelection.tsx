import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { AVATARS, useUser, type Avatar } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const EASTER_EGG_AVATAR_ID = "shopper";

const AvatarSelection = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useUser();
  const [selected, setSelected] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore previously selected avatar from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("registration_data");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.selectedAvatarId) {
        const av = AVATARS.find((a) => a.id === data.selectedAvatarId);
        if (av) setSelected(av);
      }
    }
  }, []);

  // Save selected avatar to sessionStorage
  useEffect(() => {
    if (selected) {
      const raw = sessionStorage.getItem("registration_data");
      if (raw) {
        const data = JSON.parse(raw);
        data.selectedAvatarId = selected.id;
        sessionStorage.setItem("registration_data", JSON.stringify(data));
      }
    }
  }, [selected]);

  const handleConfirm = async () => {
    if (!selected || loading) return;
    setLoading(true);

    const raw = sessionStorage.getItem("registration_data");
    if (!raw) { navigate("/"); return; }
    const data = JSON.parse(raw);
    const isComplete = data.type === "complete";

    // Fetch points from missions table
    const missionSlugs = isComplete
      ? ["cadastro-simples", "cadastro-completo"]
      : ["cadastro-simples"];

    const isEasterEgg = selected.id === EASTER_EGG_AVATAR_ID;
    if (isEasterEgg) {
      missionSlugs.push("easter-egg-avatar");
    }

    const { data: missionData } = await supabase
      .from("missions")
      .select("slug, points")
      .in("slug", missionSlugs);

    let totalPoints = 0;
    if (missionData) {
      totalPoints = missionData.reduce((sum, m) => sum + (m.points || 0), 0);
    }

    // Add avatar bonus
    const bonusPoints = selected.bonus || 0;
    totalPoints += bonusPoints;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name } },
    });

    if (authError || !authData.user) {
      toast({ title: "Erro ao criar conta", description: authError?.message || "Tente novamente", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Use SECURITY DEFINER function to complete registration (works before email confirmation)
    const { error: regError } = await supabase.rpc("complete_registration", {
      p_user_id: authData.user.id,
      p_name: data.name,
      p_phone: data.phone || null,
      p_company: data.company || null,
      p_role: data.role || null,
      p_city: data.city || null,
      p_avatar_id: selected.id,
      p_avatar_emoji: selected.emoji,
      p_points: totalPoints,
      p_registration_type: isComplete ? "complete" : "quick",
      p_accepted_terms: data.acceptedTerms,
      p_accepted_marketing: data.acceptedMarketing,
      p_mission_slugs: missionSlugs,
    });

    if (regError) {
      toast({ title: "Erro ao salvar perfil", description: regError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Store easter egg flag for onboarding page
    if (isEasterEgg) {
      sessionStorage.setItem("easter_egg_unlocked", "true");
    }

    // Save avatar and points for onboarding page (profile may not be loaded yet due to auth race condition)
    sessionStorage.setItem("onboarding_avatar", JSON.stringify(selected));
    sessionStorage.setItem("onboarding_points", String(totalPoints));

    sessionStorage.removeItem("registration_data");
    await refreshProfile();
    navigate("/onboarding-complete");
  };

  // Progress: step 3 of 3
  const step = 3;
  const totalSteps = 3;
  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
        <ChevronLeft size={24} />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">Escolha seu Avatar</h1>
      <p className="text-primary text-sm font-medium mb-2">Quem será seu companheiro de jornada?</p>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">Etapa {step} de {totalSteps}</span>
        <span className="text-xs font-bold text-primary">{progressPercent}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-secondary mb-6">
        <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3 mb-6">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-sm font-semibold text-primary">Escolha seu companheiro de jornada</p>
          <p className="text-xs text-muted-foreground">Cada avatar tem uma personalidade única</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
        {AVATARS.map((avatar, i) => (
          <motion.button
            key={avatar.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(avatar)}
            className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
              selected?.id === avatar.id
                ? "bg-primary/10 ring-2 ring-primary shadow-card"
                : "bg-card shadow-card hover:bg-secondary"
            }`}
          >
            {selected?.id === avatar.id && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-primary-foreground" />
              </div>
            )}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-2xl`}>
              {avatar.emoji}
            </div>
            <span className="text-xs font-medium text-foreground">{avatar.name}</span>
          </motion.button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card shadow-card flex items-center gap-3 mt-4"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center text-lg`}>
            {selected.emoji}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.bonus ? `🎉 Bônus +${selected.bonus} pontos!` : "Seu companheiro está pronto para embarcar!"}
            </p>
          </div>
        </motion.div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selected || loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg mt-4 flex items-center justify-center gap-2 ${
          selected && !loading
            ? "gradient-cta text-primary-foreground shadow-button"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {loading ? "Criando conta..." : "🎮 Confirmar e Embarcar!"}
      </button>
    </div>
  );
};

export default AvatarSelection;
