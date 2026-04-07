import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Brands = () => {
  const { profile, addPoints } = useUser();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("brands").select("*").eq("is_active", true).order("sort_order");
      if (data) setBrands(data);
    };
    load();
  }, []);

  if (!profile) return null;

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Marcas</h1>
        <p className="text-primary text-sm font-medium mb-6">Conheça nossos parceiros</p>

        <div className="space-y-4">
          {brands.map((brand, i) => (
            <motion.div key={brand.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-5 rounded-2xl bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-2xl`}>{brand.emoji}</div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{brand.name}</h3>
                  {brand.website && (
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                      Visitar site <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{brand.description}</p>
              {brand.cases && (
                <div className="p-3 rounded-xl bg-secondary/50 mb-3">
                  <p className="text-xs font-semibold text-foreground mb-1">Cases de sucesso</p>
                  <p className="text-xs text-muted-foreground">{brand.cases}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => addPoints(50)} className="flex-1 py-2.5 rounded-xl gradient-cta text-primary-foreground text-xs font-semibold shadow-button">
                  🎥 Assistir Vídeo (+50 pts)
                </button>
                <button onClick={() => addPoints(25)} className="py-2.5 px-4 rounded-xl border border-primary text-primary text-xs font-semibold">
                  Seguir (+25 pts)
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Brands;
