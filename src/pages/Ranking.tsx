import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Ranking = () => {
  const { profile } = useUser();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<{ name: string; points: number; avatar: string }[]>([]);
  const [minPoints, setMinPoints] = useState(500);

  useEffect(() => {
    const load = async () => {
      // Load ranking threshold from settings
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ranking_min_points")
        .single();
      if (setting) setMinPoints(Number(setting.value));

      const { data } = await supabase
        .from("profiles")
        .select("name, points, avatar_emoji")
        .order("points", { ascending: false })
        .limit(20);
      if (data) {
        setRanking(data.map((p) => ({ name: p.name, points: p.points, avatar: p.avatar_emoji || "👤" })));
      }
    };
    load();
  }, []);

  if (!profile) return null;

  const isUnlocked = profile.points >= minPoints;
  const userPosition = ranking.findIndex((r) => r.name === profile.name) + 1;
  const avatar = AVATARS.find((a) => a.id === profile.avatar_id);

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
            <p className="text-muted-foreground text-sm text-center">Acumule pelo menos {minPoints} pontos para desbloquear o ranking</p>
            <p className="text-primary font-bold text-sm mt-2">{profile.points}/{minPoints} pontos</p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl gradient-hero mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl">
                  {avatar?.emoji || profile.avatar_emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.points} pontos</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-primary">#{userPosition || "—"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {ranking.slice(0, 10).map((entry, i) => {
                const isMe = entry.name === profile.name;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`p-3 rounded-xl flex items-center gap-3 ${isMe ? "bg-primary/10 border border-primary/20" : "bg-card"}`}>
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
