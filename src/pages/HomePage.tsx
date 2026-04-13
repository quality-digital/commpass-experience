import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useAvatars, findAvatarBySlug } from "@/hooks/useAvatars";
import { supabase } from "@/integrations/supabase/client";
import { Target, Trophy, Award, Zap, ChevronRight, Lock, CheckCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";

type CompletedMission = {
  mission_id: string;
  status: string;
};

const HomePage = () => {
  const { profile, session, refreshProfile } = useUser();
  const navigate = useNavigate();
  const { data: avatarsList = [] } = useAvatars();
  const [missions, setMissions] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [rankingMinPoints, setRankingMinPoints] = useState(500);
  const [goldenPassMinPoints, setGoldenPassMinPoints] = useState(400);

  // Refresh profile on mount to ensure points are up-to-date
  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      const [missionsRes, settingsRes] = await Promise.all([
        supabase.from("missions").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("key, value").in("key", ["ranking_min_points", "golden_pass_min_points"]),
      ]);
      if (missionsRes.data) setMissions(missionsRes.data);
      if (settingsRes.data) {
        settingsRes.data.forEach((s: any) => {
          if (s.key === "ranking_min_points") setRankingMinPoints(Number(s.value));
          if (s.key === "golden_pass_min_points") setGoldenPassMinPoints(Number(s.value));
        });
      }
      if (session?.user) {
        const { data } = await supabase
          .from("user_missions")
          .select("mission_id, status")
          .eq("user_id", session.user.id);
        if (data) setCompletedMissions(data as CompletedMission[]);
      }
    };
    load();
  }, [session]);

  if (!profile) return null;

  const isCompleted = (id: string) => {
    const s = completedMissions.find((c) => c.mission_id === id)?.status;
    return s === "completed" || s === "approved";
  };
  const isPending = (id: string) => completedMissions.find((c) => c.mission_id === id)?.status === "pending_approval";
  const isUnavailable = (mission: any) => {
    if (mission.slug === "golden-pass" && profile.points < goldenPassMinPoints) return true;
    return false;
  };

  const avatar = findAvatarBySlug(avatarsList, profile.avatar_id);
  const goldenPassMission = missions.find((m) => m.slug === "golden-pass");
  const isGoldenPassCompleted = goldenPassMission ? isCompleted(goldenPassMission.id) : false;
  const totalMissions = missions.length;
  const completedCount = completedMissions.filter((c) => c.status === "completed" || c.status === "approved").length;
  const progress = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;
  const upcomingMissions = missions
    .filter((m) => !isCompleted(m.id) && !isPending(m.id) && !isUnavailable(m))
    .slice(0, 3);

  const handleMissionClick = async (mission: any) => {
    const action = mission.action;
    const slug = mission.slug;

    if (slug === "cadastro-completo") {
      if (profile.registration_type === "quick") navigate("/profile");
      return;
    }
    if (slug === "cadastro-simples" || slug === "easter-egg-avatar") return;

    if (action === "quiz") {
      const { data: quiz } = await supabase.from("quizzes").select("id").eq("slug", slug).single();
      if (quiz) navigate(`/quiz/${quiz.id}`);
      else toast({ title: "Quiz não encontrado", variant: "destructive" });
    } else if (action === "video") {
      const brandSlug = slug.replace("video-", "");
      navigate(`/brands?tab=${brandSlug}&video=true`);
    } else if (action === "social") {
      const brandSlug = slug.replace("social-", "");
      navigate(`/brands?tab=${brandSlug}`);
    } else if (action === "qr" || action === "qr-camera" || action === "upload") {
      navigate("/missions");
    } else if (slug === "golden-pass") {
      navigate("/golden-pass");
    } else {
      navigate("/missions");
    }
  };

  const quickLinks = [
    { icon: Target, label: "Missões", path: "/missions", color: "from-cyan-400 to-blue-500" },
    { icon: Trophy, label: "Ranking", path: "/ranking", color: "from-amber-400 to-orange-500" },
    { icon: Award, label: "Marcas", path: "/brands", color: "from-green-400 to-emerald-500" },
    { icon: Zap, label: "Quiz", path: "/missions", color: "from-purple-400 to-pink-500" },
  ];

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/jitterbit-logo-1775527538784.png" alt="Jitterbit" className="h-6 object-contain" />
          <div className="w-px h-5 bg-border" />
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/quality-1775526968143.png" alt="Quality Digital" className="h-6 object-contain" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-bold text-primary">{profile.points.toLocaleString("pt-BR")} pts</span>
        </div>
      </div>

      <div className="px-5 mb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl gradient-hero">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Bem-vindo(a) ao Comm Pass</p>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile.name.split(" ")[0]}! 👋</h2>
              {profile.role && <p className="text-xs text-muted-foreground">{profile.role}</p>}
              {profile.company && <p className="text-xs text-muted-foreground">{profile.company}</p>}
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full gradient-points">
              <Zap size={16} className="text-primary-foreground" />
              <span className="text-lg font-bold text-primary-foreground">{profile.points.toLocaleString("pt-BR")} pts</span>
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
            <motion.div key={mission.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} onClick={() => handleMissionClick(mission)} className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                mission.type === "digital" ? "bg-gradient-to-br from-cyan-400 to-blue-500" :
                mission.type === "quiz" ? "bg-gradient-to-br from-red-400 to-pink-500" :
                mission.type === "presencial" ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                "bg-gradient-to-br from-green-400 to-emerald-500"
              }`}>
                {mission.type === "quiz" ? "🧠" : mission.type === "presencial" ? "📍" : mission.type === "social" ? "📸" : "💻"}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{mission.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{mission.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-primary font-bold text-sm">
                  {mission.slug === "golden-pass" ? `Até ${mission.points}` : `+${mission.points}`}
                </span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {profile.points < rankingMinPoints && (
        <div className="px-5 mb-4">
          <div className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3 opacity-60">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">Ranking Bloqueado</h4>
              <p className="text-xs text-muted-foreground">Acumule {rankingMinPoints} pontos para desbloquear</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mb-4">
        <button onClick={() => navigate("/prizes")} className="w-full p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎁</span>
            <span className="font-semibold text-foreground text-sm text-left">Descubra os Prêmios Disponíveis</span>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="px-5 mb-4">
        {isGoldenPassCompleted ? (
          <div className="w-full p-4 rounded-2xl shadow-card flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <span className="font-semibold text-foreground text-sm">Golden Pass Concluído!</span>
            </div>
            <CheckCircle size={20} className="text-green-500" />
          </div>
        ) : (
          <button onClick={() => navigate("/golden-pass")} className={`w-full p-4 rounded-2xl shadow-card flex items-center justify-between ${profile.points >= goldenPassMinPoints ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200" : "bg-card opacity-60"}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <span className="font-semibold text-foreground text-sm">Golden Pass</span>
                {profile.points < goldenPassMinPoints && (
                  <p className="text-[10px] text-muted-foreground">{profile.points}/{goldenPassMinPoints} pontos para desbloquear</p>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

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
