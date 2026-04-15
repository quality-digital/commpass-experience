import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { ArrowUpCircle, ArrowDownCircle, Clock, X, Filter, Zap } from "lucide-react";

type Movement = {
  id: string;
  label: string;
  points: number;
  type: "gain" | "loss" | "pending";
  status: string;
  date: string;
  source: string;
};

type FilterType = "all" | "gains" | "losses";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const statusLabel: Record<string, { text: string; color: string }> = {
  completed: { text: "Concluída", color: "text-green-600 bg-green-50 border-green-200" },
  approved: { text: "Aprovada", color: "text-green-600 bg-green-50 border-green-200" },
  pending_approval: { text: "Pendente", color: "text-amber-600 bg-amber-50 border-amber-200" },
  rejected: { text: "Rejeitada", color: "text-destructive bg-destructive/5 border-destructive/20" },
  redeemed: { text: "Resgatado", color: "text-green-600 bg-green-50 border-green-200" },
};

export default function PointsStatement({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, profile } = useUser();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (!open || !session?.user) return;
    setLoading(true);

    const load = async () => {
      const userId = session.user.id;

      // Fetch all data sources in parallel
      const [missionsRes, quizzesRes, redemptionsRes, auditRes] = await Promise.all([
        supabase
          .from("user_missions")
          .select("id, mission_id, status, completed_at, missions(name, points)")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("user_quizzes")
          .select("id, quiz_id, score, completed_at, quizzes(title)")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("golden_pass_redemptions")
          .select("id, value, prize, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("approval_audit_log")
          .select("id, user_mission_id, previous_status, new_status, created_at, notes")
          .order("created_at", { ascending: false }),
      ]);

      const items: Movement[] = [];

      // Track which missions have audit log entries for point changes
      const auditMissionIds = new Set<string>();

      // Process audit log entries for point adjustments (approval/rejection)
      if (auditRes.data) {
        // Filter to entries relevant to this user's missions
        const userMissionIds = new Set(missionsRes.data?.map(m => m.id) || []);
        
        for (const entry of auditRes.data) {
          if (!userMissionIds.has(entry.user_mission_id)) continue;

          const mission = missionsRes.data?.find(m => m.id === entry.user_mission_id);
          if (!mission) continue;

          const missionData = mission.missions as any;
          const missionName = missionData?.name || "Missão";
          const missionPoints = missionData?.points || 0;

          // Approval: points added
          if (entry.new_status === "approved" && entry.previous_status !== "approved") {
            auditMissionIds.add(mission.id);
            items.push({
              id: `audit-${entry.id}-gain`,
              label: missionName,
              points: missionPoints,
              type: "gain",
              status: "approved",
              date: entry.created_at,
              source: "mission",
            });
          }

          // Rejection from approved: points deducted
          if (entry.new_status === "rejected" && entry.previous_status === "approved") {
            auditMissionIds.add(mission.id);
            items.push({
              id: `audit-${entry.id}-loss`,
              label: `${missionName} (Rejeitada)`,
              points: -missionPoints,
              type: "loss",
              status: "rejected",
              date: entry.created_at,
              source: "mission",
            });
          }
        }
      }

      // Build a set of quiz mission_ids to avoid duplicating quiz entries
      const quizMissionIds = new Set<string>();
      if (quizzesRes.data && missionsRes.data) {
        for (const q of quizzesRes.data) {
          const quizData = q.quizzes as any;
          if (quizData?.title) {
            const matchingMission = missionsRes.data.find(m => {
              const mData = m.missions as any;
              return mData?.name === quizData.title;
            });
            if (matchingMission) quizMissionIds.add(matchingMission.id);
          }
        }
      }

      // Build a set of mission IDs whose points come from golden_pass_redemptions
      // These missions should not show their configured points — the redemption entries handle that
      const goldenPassMissionIds = new Set<string>();
      if (redemptionsRes.data && redemptionsRes.data.length > 0 && missionsRes.data) {
        for (const m of missionsRes.data) {
          const mData = m.missions as any;
          if (mData?.name?.toLowerCase().includes("golden pass")) {
            goldenPassMissionIds.add(m.id);
          }
        }
      }

      // Process direct mission completions (not tracked by audit log, excluding quiz missions)
      if (missionsRes.data) {
        for (const m of missionsRes.data) {
          if (auditMissionIds.has(m.id)) continue;
          if (quizMissionIds.has(m.id)) continue;
          if (goldenPassMissionIds.has(m.id)) continue;
          
          const missionData = m.missions as any;
          const name = missionData?.name || "Missão";
          const pts = missionData?.points || 0;

          if (m.status === "completed") {
            items.push({
              id: `mission-${m.id}`,
              label: name,
              points: pts,
              type: "gain",
              status: "completed",
              date: m.completed_at,
              source: "mission",
            });
          } else if (m.status === "pending_approval") {
            items.push({
              id: `mission-${m.id}`,
              label: name,
              points: pts,
              type: "pending",
              status: "pending_approval",
              date: m.completed_at,
              source: "mission",
            });
          } else if (m.status === "rejected") {
            items.push({
              id: `mission-${m.id}`,
              label: name,
              points: 0,
              type: "pending",
              status: "rejected",
              date: m.completed_at,
              source: "mission",
            });
          }
        }
      }

      // Process quiz completions
      if (quizzesRes.data) {
        for (const q of quizzesRes.data) {
          const quizData = q.quizzes as any;
          items.push({
            id: `quiz-${q.id}`,
            label: quizData?.title || "Quiz",
            points: q.score,
            type: "gain",
            status: "completed",
            date: q.completed_at,
            source: "quiz",
          });
        }
      }

      // Process golden pass redemptions
      if (redemptionsRes.data) {
        for (const r of redemptionsRes.data) {
          if (r.value > 0) {
            items.push({
              id: `gp-${r.id}`,
              label: r.prize ? `Golden Pass: ${r.prize}` : "Golden Pass",
              points: r.value,
              type: "gain",
              status: "redeemed",
              date: r.created_at,
              source: "golden_pass",
            });
          }
        }
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMovements(items);
      setLoading(false);
    };

    load();
  }, [open, session?.user?.id]);

  const filtered = movements.filter((m) => {
    if (filter === "gains") return m.type === "gain";
    if (filter === "losses") return m.type === "loss";
    return true;
  });

  const totalGains = movements.filter(m => m.type === "gain").reduce((s, m) => s + m.points, 0);
  const totalLosses = movements.filter(m => m.type === "loss").reduce((s, m) => s + Math.abs(m.points), 0);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 z-[60] flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-card rounded-t-3xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-3 flex items-center justify-between border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Extrato de Pontos</h2>
              <p className="text-xs text-muted-foreground">Histórico completo de movimentações</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground p-1">
              <X size={20} />
            </button>
          </div>

          {/* Summary */}
          <div className="px-5 py-3 grid grid-cols-3 gap-2 shrink-0">
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-center">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Ganhos</p>
              <p className="text-lg font-bold text-green-700">+{totalGains.toLocaleString("pt-BR")}</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Descontos</p>
              <p className="text-lg font-bold text-destructive">-{totalLosses.toLocaleString("pt-BR")}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Saldo</p>
              <p className="text-lg font-bold text-primary">{(profile?.points ?? 0).toLocaleString("pt-BR")}</p>
            </div>
          </div>


          {/* Movements List */}
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Carregando extrato...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Zap size={32} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação encontrada</p>
                <p className="text-xs text-muted-foreground/60">Complete missões para ganhar pontos!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((m, i) => {
                  const st = statusLabel[m.status] || statusLabel.completed;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        m.type === "gain" ? "bg-green-50" : m.type === "loss" ? "bg-destructive/5" : "bg-amber-50"
                      }`}>
                        {m.type === "gain" ? (
                          <ArrowUpCircle size={18} className="text-green-600" />
                        ) : m.type === "loss" ? (
                          <ArrowDownCircle size={18} className="text-destructive" />
                        ) : (
                          <Clock size={18} className="text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{formatDate(m.date)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${st.color}`}>
                            {st.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-bold ${
                          m.type === "gain" ? "text-green-600" : m.type === "loss" ? "text-destructive" : "text-amber-600"
                        }`}>
                          {m.type === "gain" ? "+" : m.type === "loss" ? "" : "+"}{m.points.toLocaleString("pt-BR")}
                        </span>
                        <p className="text-[10px] text-muted-foreground">pts</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
