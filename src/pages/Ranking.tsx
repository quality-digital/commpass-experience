import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Trophy, Crown, Award, Clock, Info } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Ranking = () => {
  const { profile } = useUser();
  const [ranking, setRanking] = useState<{ name: string; points: number; avatar: string; company: string | null }[]>([]);
  const [minPoints, setMinPoints] = useState(500);
  const [activeTab, setActiveTab] = useState<"ranking" | "prizes">("ranking");
  const [prizeName, setPrizeName] = useState("");
  const [prizeValue, setPrizeValue] = useState("");
  const [prizeRules, setPrizeRules] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["ranking_min_points", "prize_name", "prize_value", "prize_rules"]);

      if (settings) {
        settings.forEach((s) => {
          if (s.key === "ranking_min_points") setMinPoints(Number(s.value));
          if (s.key === "prize_name") setPrizeName(s.value);
          if (s.key === "prize_value") setPrizeValue(s.value);
          if (s.key === "prize_rules") setPrizeRules(s.value);
        });
      }

      const { data } = await supabase
        .from("profiles")
        .select("name, points, avatar_emoji, company")
        .order("points", { ascending: false })
        .limit(20);
      if (data) {
        setRanking(data.map((p) => ({ name: p.name, points: p.points, avatar: p.avatar_emoji || "👤", company: p.company })));
      }
    };
    load();
  }, []);

  if (!profile) return null;

  const isUnlocked = profile.points >= minPoints;
  const userPosition = ranking.findIndex((r) => r.name === profile.name) + 1;
  const avatar = AVATARS.find((a) => a.id === profile.avatar_id);
  const pointsToUnlock = minPoints - profile.points;

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-0.5">Ranking & Prêmios</h1>
        <p className="text-primary text-sm font-medium mb-2">
          {isUnlocked ? "Você está no ranking!" : `Faltam ${pointsToUnlock} pts para desbloquear`}
        </p>

        {/* Updated timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
          <Clock size={12} />
          <span>Atualizado em: {new Date().toLocaleDateString("pt-BR")} - {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h</span>
          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center ml-0.5">
            <Info size={10} className="text-primary" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              activeTab === "ranking"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <Trophy size={16} />
            Ranking
          </button>
          <button
            onClick={() => setActiveTab("prizes")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              activeTab === "prizes"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <Award size={16} />
            Prêmios
          </button>
        </div>

        {activeTab === "ranking" ? (
          <>
            {!isUnlocked ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Lock size={32} className="text-muted-foreground" />
                </div>
                <h2 className="font-bold text-foreground text-lg mb-2">Ranking Bloqueado</h2>
                <p className="text-muted-foreground text-sm text-center">Acumule pelo menos {minPoints} pontos para desbloquear o ranking</p>
                <p className="text-primary font-bold text-sm mt-2">{profile.points}/{minPoints} pontos</p>
              </div>
            ) : (
              <>
                {/* User position card */}
                <div className="p-4 rounded-2xl border-2 border-primary/20 bg-card mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-extrabold text-primary">#{userPosition || "—"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">Sua Posição</p>
                      <p className="text-xs text-muted-foreground">{profile.company || "Participante"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-primary">{profile.points.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">pontos</p>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <h3 className="font-bold text-foreground mb-3">Classificação Geral</h3>
                <div className="space-y-2">
                  {ranking.slice(0, 10).map((entry, i) => {
                    const isMe = entry.name === profile.name;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-3 rounded-xl flex items-center gap-3 ${
                          isMe ? "bg-primary/10 border border-primary/20" : "bg-card"
                        }`}
                      >
                        <span className={`w-8 text-center font-bold text-sm ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                          {i < 3 ? medals[i] : `${i + 1}`}
                        </span>
                        <span className="text-xl">{entry.avatar}</span>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${isMe ? "text-primary" : "text-foreground"}`}>{entry.name}</p>
                          {entry.company && (
                            <p className="text-xs text-muted-foreground">{entry.company}</p>
                          )}
                        </div>
                        <span className="font-bold text-sm text-primary">{entry.points.toLocaleString("pt-BR")}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* Prêmios Tab */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Os prêmios serão entregues ao final do evento. Acompanhe o ranking para garantir sua posição!
            </p>

            {/* Grand Prize Card */}
            <div className="p-5 rounded-2xl border-2 border-yellow-300 bg-yellow-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <Crown size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-yellow-600">🏆 Grand Prize</p>
                  <p className="font-bold text-foreground text-lg">{prizeName || "Prêmio Principal"}</p>
                  <p className="text-primary font-bold text-base">{prizeValue}</p>
                </div>
              </div>
            </div>

            {/* Prize Rules Card */}
            <div className="p-5 rounded-2xl border-2 border-primary/10 bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy size={20} className="text-primary" />
                </div>
                <h4 className="font-bold text-foreground">Regras da Premiação</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {prizeRules || "Regras a serem definidas."}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Ranking;
