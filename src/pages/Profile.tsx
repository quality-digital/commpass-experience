import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ChevronRight, Shield } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Profile = () => {
  const { profile, logout, isAdmin, getCompletedMissions } = useUser();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("missions").select("id").eq("is_active", true);
      if (data) setMissions(data);
      const completed = await getCompletedMissions();
      setCompletedCount(completed.length);
    };
    load();
  }, []);

  if (!profile) return null;

  const avatar = AVATARS.find((a) => a.id === profile.avatar_id);
  const totalMissions = missions.length;
  const progress = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-4xl shadow-card mb-3`}>
            {avatar?.emoji || profile.avatar_emoji || "👤"}
          </div>
          <h2 className="font-bold text-foreground text-lg">{profile.name}</h2>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full gradient-points">
            <span className="text-sm font-bold text-primary-foreground">⚡ {profile.points} pts</span>
          </div>
        </motion.div>

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

        <div className="p-4 rounded-2xl bg-card shadow-card mb-4 space-y-3">
          <h3 className="font-bold text-foreground text-sm">Informações</h3>
          {[
            { label: "Nome", value: profile.name },
            { label: "E-mail", value: profile.email },
            { label: "Telefone", value: profile.phone || "—" },
            { label: "Empresa", value: profile.company || "—" },
            { label: "Cargo", value: profile.role || "—" },
            { label: "Cidade", value: profile.city || "—" },
            { label: "Cadastro", value: profile.registration_type === "complete" ? "Completo" : "Rápido" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="text-foreground font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary" />
              <p className="font-semibold text-foreground text-sm">Painel Admin</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}

        {profile.registration_type === "quick" && (
          <button className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-foreground text-sm">Completar cadastro</p>
              <p className="text-xs text-primary">Ganhe mais 250 pontos!</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}

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
