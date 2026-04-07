import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { MISSIONS } from "@/data/missions";
import { LogOut, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Profile = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  if (!user) { navigate("/"); return null; }

  const completedCount = user.completedMissions.length;
  const totalMissions = MISSIONS.length;
  const progress = Math.round((completedCount / totalMissions) * 100);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>

        {/* Avatar + Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center mb-6"
        >
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${user.avatar?.color} flex items-center justify-center text-4xl shadow-card mb-3`}>
            {user.avatar?.emoji}
          </div>
          <h2 className="font-bold text-foreground text-lg">{user.name}</h2>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full gradient-points">
            <span className="text-sm font-bold text-primary-foreground">⚡ {user.points} pts</span>
          </div>
        </motion.div>

        {/* Progress */}
        <div className="p-4 rounded-2xl bg-card shadow-card mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Progresso</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{completedCount}/{totalMissions} missões concluídas</p>
        </div>

        {/* Info */}
        <div className="p-4 rounded-2xl bg-card shadow-card mb-4 space-y-3">
          <h3 className="font-bold text-foreground text-sm">Informações</h3>
          {[
            { label: "Nome", value: user.name },
            { label: "E-mail", value: user.email },
            { label: "Telefone", value: user.phone || "—" },
            { label: "Empresa", value: user.company || "—" },
            { label: "Cargo", value: user.role || "—" },
            { label: "Cidade", value: user.city || "—" },
            { label: "Cadastro", value: user.registrationType === "complete" ? "Completo" : "Rápido" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="text-foreground font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Complete registration CTA */}
        {user.registrationType === "quick" && (
          <button className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-foreground text-sm">Completar cadastro</p>
              <p className="text-xs text-primary">Ganhe mais 250 pontos!</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl border border-destructive/20 flex items-center justify-center gap-2 text-destructive font-semibold text-sm mb-6"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
