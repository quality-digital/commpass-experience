import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { AVATARS, useUser, type Avatar } from "@/contexts/UserContext";

const AvatarSelection = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [selected, setSelected] = useState<Avatar | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const raw = sessionStorage.getItem("registration_data");
    if (!raw) { navigate("/"); return; }
    const data = JSON.parse(raw);
    const points = data.type === "complete" ? 350 : 100;
    const bonusPoints = selected.bonus || 0;

    setUser({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      company: data.company || undefined,
      role: data.role || undefined,
      city: data.city || undefined,
      avatar: selected,
      points: points + bonusPoints,
      registrationType: data.type,
      completedMissions: data.type === "complete" ? ["cadastro-simples", "cadastro-completo"] : ["cadastro-simples"],
      completedQuizzes: [],
      acceptedTerms: data.acceptedTerms,
      acceptedMarketing: data.acceptedMarketing,
    });
    sessionStorage.removeItem("registration_data");
    navigate("/onboarding-complete");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
        <ChevronLeft size={24} />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">Escolha seu Avatar</h1>
      <p className="text-primary text-sm font-medium mb-4">Quem será seu companheiro de jornada?</p>

      <div className="w-full h-1.5 rounded-full bg-secondary mb-6">
        <div className="w-3/4 h-full rounded-full gradient-primary" />
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
        disabled={!selected}
        className={`w-full py-4 rounded-2xl font-bold text-lg mt-4 flex items-center justify-center gap-2 ${
          selected
            ? "gradient-cta text-primary-foreground shadow-button"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        🎮 Confirmar e Embarcar!
      </button>
    </div>
  );
};

export default AvatarSelection;
