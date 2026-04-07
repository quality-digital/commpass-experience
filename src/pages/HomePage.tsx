import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Trophy, Award, Zap, ChevronRight, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const HomePage = () => {
  const { profile, getCompletedMissions } = useUser();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("missions").select("*").eq("is_active", true).order("sort_order");
      if (data) setMissions(data);
      const completed = await getCompletedMissions();
      setCompletedIds(completed);
    };
    load();
  }, []);

  if (!profile) return null;

  const avatar = AVATARS.find((a) => a.id === profile.avatar_id);
  const totalMissions = missions.length;
  const completedCount = completedIds.length;
  const progress = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;
  const upcomingMissions = missions.filter((m) => !completedIds.includes(m.id)).slice(0, 3);

  const quickLinks = [
    { icon: Target, label: "Missões", path: "/missions", color: "from-cyan-400 to-blue-500" },
    { icon: Trophy, label: "Ranking", path: "/ranking", color: "from-amber-400 to-orange-500" },
    { icon: Award, label: "Marcas", path: "/brands", color: "from-green-400 to-emerald-500" },
    { icon: Zap, label: "Quiz", path: "/missions", color: "from-purple-400 to-pink-500" },
  ];

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">⚡ Jitterbit</span>
          <span className="text-sm font-semibold text-muted-foreground">💎 Quality</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-bold text-primary">{profile.points} pts</span>
        </div>
      </div>

      <div className="px-5 mb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl gradient-hero">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Bem-vindo(a) ao VTEX Day</p>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile.name.split(" ")[0]}! 👋</h2>
              <p className="text-xs text-muted-foreground">{profile.role || "participante"} · {profile.company || "VTEX Day"}</p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full gradient-points">
              <Zap size={16} className="text-primary-foreground" />
              <span className="text-lg font-bold text-primary-foreground">{profile.points} pts</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 mb-4">
        <div className="p-4 rounded-2xl bg-card shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-foreground text-sm">Jornada de Missões</h3>
            <span className="text-primary font-bold text-sm">{progress}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{completedCount} de {totalMissions} completadas</p>
          <div className="w-full h-2 rounded-full bg-secondary">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full gradient-primary" />
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <h3 className="font-bold text-foreground text-sm mb-3">Acesso Rápido</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickLinks.map((link, i) => (
            <motion.button key={link.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} onClick={() => navigate(link.path)} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-card`}>
                <link.icon size={24} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">{link.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">Próximas Missões</h3>
          <button onClick={() => navigate("/missions")} className="text-primary text-xs font-semibold flex items-center">
            Ver todas <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {upcomingMissions.map((mission, i) => (
            <motion.div key={mission.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} onClick={() => navigate("/missions")} className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3 cursor-pointer">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                mission.type === "digital" ? "bg-gradient-to-br from-cyan-400 to-blue-500" :
                mission.type === "quiz" ? "bg-gradient-to-br from-red-400 to-pink-500" :
                mission.type === "presencial" ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                "bg-gradient-to-br from-green-400 to-emerald-500"
              }`}>
                {mission.type === "quiz" ? "🧠" : mission.type === "presencial" ? "📍" : mission.type === "social" ? "📸" : "💻"}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm">{mission.name}</h4>
                <p className="text-xs text-muted-foreground">{mission.description.slice(0, 40)}...</p>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-sm">+{mission.points}</span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {profile.points < 50 && (
        <div className="px-5 mb-4">
          <div className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3 opacity-60">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">Ranking Bloqueado</h4>
              <p className="text-xs text-muted-foreground">Acumule 50 pontos para desbloquear</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mb-4">
        <button onClick={() => navigate("/brands")} className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⭐</span>
            <span className="font-semibold text-foreground text-sm">Conheça Jitterbit e Quality Digital</span>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </div>
    </AppLayout>
  );
};

export default HomePage;
