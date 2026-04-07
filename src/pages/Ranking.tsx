import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { RANKING_MOCK } from "@/data/quizzes";
import { Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Ranking = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  if (!user) { navigate("/"); return null; }

  const isUnlocked = user.points >= 50;

  // Insert user into ranking
  const allRanking = [...RANKING_MOCK, { name: user.name, points: user.points, avatar: user.avatar?.emoji || "👤" }]
    .sort((a, b) => b.points - a.points);
  const userPosition = allRanking.findIndex((r) => r.name === user.name) + 1;

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Ranking</h1>
        <p className="text-primary text-sm font-medium mb-6">Veja sua posição na jornada</p>

        {!isUnlocked ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">Ranking Bloqueado</h2>
            <p className="text-muted-foreground text-sm text-center">Acumule pelo menos 50 pontos para desbloquear o ranking</p>
            <p className="text-primary font-bold text-sm mt-2">{user.points}/50 pontos</p>
          </div>
        ) : (
          <>
            {/* User position */}
            <div className="p-4 rounded-2xl gradient-hero mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl">
                  {user.avatar?.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.points} pontos</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-primary">#{userPosition}</p>
                </div>
              </div>
            </div>

            {/* Top users */}
            <div className="space-y-2">
              {allRanking.slice(0, 10).map((entry, i) => {
                const isMe = entry.name === user.name;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl flex items-center gap-3 ${isMe ? "bg-primary/10 border border-primary/20" : "bg-card"}`}
                  >
                    <span className={`w-8 text-center font-bold text-sm ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <span className="text-xl">{entry.avatar}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${isMe ? "text-primary" : "text-foreground"}`}>{entry.name}</p>
                    </div>
                    <span className="font-bold text-sm text-primary">{entry.points} pts</span>
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
