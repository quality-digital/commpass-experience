import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, QrCode, Upload, Play } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";

type MissionType = "digital" | "presencial" | "quiz" | "social";

const typeColors: Record<string, string> = {
  digital: "text-blue-500 border-blue-200 bg-blue-50",
  presencial: "text-amber-600 border-amber-200 bg-amber-50",
  quiz: "text-red-500 border-red-200 bg-red-50",
  social: "text-green-600 border-green-200 bg-green-50",
};

const difficultyColors: Record<string, string> = {
  "fácil": "bg-green-100 text-green-700",
  "médio": "bg-amber-100 text-amber-700",
  "difícil": "bg-red-100 text-red-700",
};

const Missions = () => {
  const { profile, addPoints, completeMission, getCompletedMissions } = useUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | string>("all");
  const [qrInput, setQrInput] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
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

  const completedCount = completedIds.length;
  const available = missions.filter((m) => !completedIds.includes(m.id)).length;
  const filtered = filter === "all" ? missions : missions.filter((m) => m.type === filter);

  const filters = [
    { key: "all", label: "Todas" },
    { key: "presencial", label: "Presencial", dot: "bg-amber-400" },
    { key: "digital", label: "Digital", dot: "bg-blue-400" },
    { key: "quiz", label: "Quiz", dot: "bg-red-400" },
    { key: "social", label: "Social", dot: "bg-green-400" },
  ];

  const handleAction = async (missionId: string, action?: string, slug?: string) => {
    if (action === "quiz") {
      // Find quiz by slug matching mission slug
      const { data: quiz } = await supabase.from("quizzes").select("id, slug").eq("slug", slug).single();
      if (quiz) navigate(`/quiz/${quiz.id}`);
    } else if (action === "qr") {
      setQrInput(missionId);
    } else {
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        await addPoints(mission.points);
        await completeMission(missionId);
        setCompletedIds((p) => [...p, missionId]);
        fireConfetti();
        toast({ title: "🎉 Missão concluída!", description: `+${mission.points} pontos conquistados!` });
      }
    }
  };

  const handleQrSubmit = async () => {
    if (qrCode.trim() && qrInput) {
      const mission = missions.find((m) => m.id === qrInput);
      if (mission) {
        await addPoints(mission.points);
        await completeMission(qrInput);
        setCompletedIds((p) => [...p, qrInput]);
        fireConfetti();
        toast({ title: "🎉 Missão concluída!", description: `+${mission.points} pontos conquistados!` });
      }
      setQrInput(null);
      setQrCode("");
    }
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">⚡ Jitterbit</span>
          <span className="text-sm font-semibold text-muted-foreground">💎 Quality</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <span className="text-sm font-bold text-primary">⚡ {profile.points} pts</span>
        </div>
      </div>

      <div className="px-5">
        <h1 className="text-2xl font-bold text-foreground mb-1">Missões</h1>
        <p className="text-primary text-sm font-medium mb-6">Complete missões e acumule pontos</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: completedCount, total: missions.length, label: "Completadas" },
            { value: profile.points, total: 2075, label: "Pontos ganhos" },
            { value: available, label: "Disponíveis" },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl border border-border text-center">
              <p className="text-lg font-bold text-foreground">
                {stat.value}
                {stat.total && <span className="text-xs text-muted-foreground font-normal">/{stat.total}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-0">
          {filtered.map((mission, i) => {
            const isCompleted = completedIds.includes(mission.id);
            return (
              <motion.div key={mission.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "gradient-primary" : "border-2 border-border bg-card"}`}>
                    {isCompleted ? <Check size={14} className="text-primary-foreground" /> : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                  </div>
                  {i < filtered.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[16px]" />}
                </div>

                <div className={`flex-1 p-4 rounded-2xl mb-3 ${isCompleted ? "bg-card/60 opacity-60" : "bg-card shadow-card"}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isCompleted && <span className="text-xs">✓</span>}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColors[mission.type] || ""}`}>
                        {mission.type}
                      </span>
                      {mission.location && <span className="text-[10px] text-muted-foreground">📍 {mission.location}</span>}
                    </div>
                    <span className="text-primary font-bold text-sm">+{mission.points}</span>
                  </div>
                  <h4 className={`font-bold text-sm mb-1 ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>{mission.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColors[mission.difficulty] || ""}`}>● {mission.difficulty}</span>
                    {!isCompleted && mission.action && (
                      <button onClick={() => handleAction(mission.id, mission.action, mission.slug)} className="flex items-center gap-1 text-xs font-semibold text-primary">
                        {mission.action === "qr" && <QrCode size={14} />}
                        {mission.action === "upload" && <Upload size={14} />}
                        {mission.action === "video" && <Play size={14} />}
                        {mission.action === "quiz" && <span>⚡</span>}
                        {mission.action_label}
                      </button>
                    )}
                    {!isCompleted && !mission.action && (
                      <button onClick={() => handleAction(mission.id)} className="text-xs font-semibold text-primary">Completar</button>
                    )}
                    {isCompleted && <span className="text-xs text-muted-foreground">Concluída ✓</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {qrInput && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm p-6 rounded-2xl bg-card shadow-card">
            <h3 className="font-bold text-foreground text-lg mb-2">Inserir Código</h3>
            <p className="text-sm text-muted-foreground mb-4">Digite o código do QR Code ou insira manualmente</p>
            <input type="text" placeholder="Ex: VTEX2026" value={qrCode} onChange={(e) => setQrCode(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setQrInput(null); setQrCode(""); }} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-semibold text-sm">Cancelar</button>
              <button onClick={handleQrSubmit} className="flex-1 py-3 rounded-xl gradient-cta text-primary-foreground font-semibold text-sm shadow-button">Confirmar</button>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
};

export default Missions;
