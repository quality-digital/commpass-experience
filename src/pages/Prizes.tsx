import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Image, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface Prize {
  id: string;
  position: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

const Prizes = () => {
  const navigate = useNavigate();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizeRules, setPrizeRules] = useState("");

  useEffect(() => {
    const load = async () => {
      const [prizesRes, settingsRes] = await Promise.all([
        supabase.from("prizes").select("id, position, name, description, image_url").order("position", { ascending: true }),
        supabase.from("app_settings").select("key, value").eq("key", "prize_rules"),
      ]);
      if (prizesRes.data) setPrizes(prizesRes.data);
      if (settingsRes.data?.[0]) setPrizeRules(settingsRes.data[0].value);
    };
    load();
  }, []);

  const mainPrize = prizes.find((p) => p.position === 1);
  const otherPrizes = prizes.filter((p) => p.position !== 1);

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-0.5">Ranking & Prêmios</h1>
        <p className="text-primary text-sm font-medium mb-2">Confira o que você pode ganhar!</p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => navigate("/ranking")}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all border-border bg-card text-muted-foreground"
          >
            <Trophy size={16} />
            Ranking
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all border-primary bg-primary/5 text-primary shadow-sm"
          >
            <Award size={16} />
            Prêmios
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {prizes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Prêmios em breve!</p>
              <p className="text-sm">Os prêmios serão divulgados em breve.</p>
            </div>
          ) : (
            <>
              {mainPrize && (
                <div className="p-5 rounded-2xl border-2 border-accent bg-gradient-to-br from-accent/30 to-accent/10 overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={20} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">🏆 {mainPrize.position}º Lugar</span>
                  </div>
                  {mainPrize.image_url ? (
                    <img src={mainPrize.image_url} alt={mainPrize.name} loading="lazy" className="w-full max-h-48 object-contain rounded-xl mb-3 bg-background/50" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-secondary flex items-center justify-center mb-3">
                      <Image size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  <p className="font-bold text-foreground text-xl">{mainPrize.name}</p>
                  {mainPrize.description && <p className="text-sm text-muted-foreground mt-1">{mainPrize.description}</p>}
                </div>
              )}

              {otherPrizes.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {otherPrizes.map((prize) => (
                    <motion.div key={prize.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{prize.position}º</span>
                      </div>
                      {prize.image_url ? (
                        <img src={prize.image_url} alt={prize.name} loading="lazy" className="w-16 h-16 rounded-lg object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Image size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{prize.name}</p>
                        {prize.description && <p className="text-xs text-muted-foreground mt-0.5">{prize.description}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {prizeRules && (
                <div className="p-5 rounded-2xl border-2 border-primary/10 bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Trophy size={20} className="text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground">Regras da Premiação</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{prizeRules}</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Prizes;
