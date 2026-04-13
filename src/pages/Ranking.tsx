import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Trophy, Award, RefreshCw } from "lucide-react";
import AppLayout from "@/components/AppLayout";

type RankingEntry = {
  user_id: string;
  name: string;
  points: number;
  avatar: string;
  company: string | null;
};

/** Exibe apenas o primeiro nome + asteriscos para privacidade */
const maskName = (fullName: string, isCurrentUser: boolean): string => {
  if (isCurrentUser) return fullName;
  const parts = fullName.trim().split(" ");
  const first = parts[0];
  if (parts.length <= 1) return first;
  const rest = parts.slice(1).map((p) => "*".repeat(p.length)).join(" ");
  return `${first} ${rest}`;
};

const Ranking = () => {
  const { profile, session } = useUser();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [minPoints, setMinPoints] = useState(500);
  const [activeTab, setActiveTab] = useState<"ranking" | "prizes">("ranking");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userGlobalPosition, setUserGlobalPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, rankingRes] = await Promise.all([
        supabase.from("app_settings").select("key, value").eq("key", "ranking_min_points"),
        supabase.from("ranking_public" as any).select("user_id, name, points, avatar_emoji").order("points", { ascending: false }).limit(10),
      ]);

      if (settingsRes.data?.[0]) setMinPoints(Number(settingsRes.data[0].value));

      if (rankingRes.data) {
        setRanking(
          rankingRes.data.map((p: any) => ({
            user_id: p.user_id,
            name: p.name,
            points: p.points,
            avatar: p.avatar_emoji || "👤",
            company: null,
          }))
        );
      }

      // Calcular posição global do usuário se não estiver no top 10
      if (session?.user) {
        const isInTop10 = rankingRes.data?.some((p: any) => p.user_id === session.user.id);
        if (!isInTop10 && profile) {
          const { count } = await supabase
            .from("ranking_public" as any)
            .select("*", { count: "exact", head: true })
            .gt("points", profile.points);
          setUserGlobalPosition(count !== null ? count + 1 : null);
        } else {
          setUserGlobalPosition(null);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Erro ao carregar ranking:", err);
    } finally {
      setLoading(false);
    }
  }, [session, profile]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  useEffect(() => {
    if (activeTab === "prizes") {
      navigate("/prizes");
      setActiveTab("ranking");
    }
  }, [activeTab, navigate]);

  if (!profile) return null;

  const isUnlocked = profile.points >= minPoints;
  const pointsToUnlock = minPoints - profile.points;
  const currentUserId = session?.user?.id;

  // Posição do usuário no top 10 (1-based) ou posição global
  const top10Index = ranking.findIndex((r) => r.user_id === currentUserId);
  const userPosition = top10Index >= 0 ? top10Index + 1 : userGlobalPosition;

  const formatLastUpdated = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${day}/${month} às ${hours}:${mins}`;
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <div className="flex items-start justify-between mb-0.5">
          <h1 className="text-2xl font-bold text-foreground">Ranking & Prêmios</h1>
          {isUnlocked && (
            <button
              onClick={loadRanking}
              disabled={loading}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
              title="Atualizar ranking"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
        <p className="text-primary text-sm font-medium mb-2">
          {isUnlocked ? "Você está no ranking!" : `Faltam ${pointsToUnlock} pts para desbloquear`}
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("ranking")}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all border-primary bg-primary/5 text-primary shadow-sm"
          >
            <Trophy size={16} />
            Ranking
          </button>
          <button
            onClick={() => setActiveTab("prizes")}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all border-border bg-card text-muted-foreground"
          >
            <Award size={16} />
            Prêmios
          </button>
        </div>

        {!isUnlocked ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">Ranking Bloqueado</h2>
            <p className="text-muted-foreground text-sm text-center">
              Continue participando para desbloquear o ranking
            </p>
            <div className="mt-3 w-48">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{profile.points} pts</span>
                <span>{minPoints} pts</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full gradient-primary transition-all"
                  style={{ width: `${Math.min((profile.points / minPoints) * 100, 100)}%` }}
                />
              </div>
              <p className="text-primary font-bold text-sm mt-2 text-center">
                {profile.points}/{minPoints} pontos
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Posição do usuário - sempre primeiro */}
            <div className="p-4 rounded-2xl border-2 border-primary/20 bg-card mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-primary">
                    #{userPosition || "—"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Sua Posição</p>
                  {profile.company && <p className="text-xs text-muted-foreground">{profile.company}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-primary">
                    {profile.points.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            </div>

            {/* Pódio - Top 4 */}
            {ranking.length >= 4 && (
              <div className="mb-6">
                <h3 className="font-bold text-foreground mb-4">Pódio</h3>
                <div className="flex items-end justify-center gap-2">
                  {/* 2º lugar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col items-center w-[22%]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg mb-1.5 relative">
                      <span className="text-2xl">{ranking[1].avatar}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground text-center truncate w-full">
                      {maskName(ranking[1].name, ranking[1].user_id === currentUserId)}
                    </p>
                    <div className="w-full mt-2 rounded-t-xl bg-gradient-to-t from-slate-200 to-slate-100 flex flex-col items-center justify-center pt-3 pb-2" style={{ height: 72 }}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md mb-1">
                        <span className="text-sm">🥈</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">{ranking[1].points.toLocaleString("pt-BR")} pts</span>
                    </div>
                  </motion.div>

                  {/* 1º lugar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center w-[26%]"
                  >
                    <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-lg mb-1.5 relative ring-2 ring-amber-300/50" style={{ width: 72, height: 72 }}>
                      <span className="text-3xl">{ranking[0].avatar}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground text-center truncate w-full">
                      {maskName(ranking[0].name, ranking[0].user_id === currentUserId)}
                    </p>
                    <div className="w-full mt-2 rounded-t-xl bg-gradient-to-t from-amber-100 to-amber-50 flex flex-col items-center justify-center pt-3 pb-2" style={{ height: 96 }}>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-md mb-1">
                        <span className="text-lg">🥇</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary">{ranking[0].points.toLocaleString("pt-BR")} pts</span>
                    </div>
                  </motion.div>

                  {/* 3º lugar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center w-[22%]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-300 to-amber-600 flex items-center justify-center shadow-lg mb-1.5">
                      <span className="text-2xl">{ranking[2].avatar}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground text-center truncate w-full">
                      {maskName(ranking[2].name, ranking[2].user_id === currentUserId)}
                    </p>
                    <div className="w-full mt-2 rounded-t-xl bg-gradient-to-t from-orange-100 to-orange-50 flex flex-col items-center justify-center pt-3 pb-2" style={{ height: 56 }}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-300 to-amber-600 flex items-center justify-center shadow-md mb-1">
                        <span className="text-sm">🥉</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">{ranking[2].points.toLocaleString("pt-BR")} pts</span>
                    </div>
                  </motion.div>

                  {/* 4º lugar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex flex-col items-center w-[22%]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center shadow-lg mb-1.5">
                      <span className="text-2xl">{ranking[3].avatar}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground text-center truncate w-full">
                      {maskName(ranking[3].name, ranking[3].user_id === currentUserId)}
                    </p>
                    <div className="w-full mt-2 rounded-t-xl bg-gradient-to-t from-pink-100 to-pink-50 flex flex-col items-center justify-center pt-3 pb-2" style={{ height: 44 }}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center shadow-md mb-1">
                        <span className="text-sm">🏅</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">{ranking[3].points.toLocaleString("pt-BR")} pts</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">Top 10</h3>
              {lastUpdated && (
                <span className="text-[10px] text-muted-foreground">
                  Atualizado em: {formatLastUpdated(lastUpdated)}
                </span>
              )}
            </div>

            <div className="space-y-2 pb-4">
              {ranking.map((entry, i) => {
                const isMe = entry.user_id === currentUserId;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl flex items-center gap-3 ${
                      isMe ? "bg-primary/10 border border-primary/20" : "bg-card"
                    }`}
                  >
                    <span
                      className={`w-8 text-center font-bold text-sm ${
                        i < 3 ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {i < 3 ? medals[i] : `${i + 1}`}
                    </span>
                    <span className="text-xl">{entry.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm truncate ${
                          isMe ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {maskName(entry.name, isMe)}
                        {isMe && (
                          <span className="ml-1 text-[10px] font-normal text-primary">(você)</span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-primary shrink-0">
                      {entry.points.toLocaleString("pt-BR")}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Ranking;
