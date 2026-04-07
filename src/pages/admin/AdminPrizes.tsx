import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PRIZE_KEYS = ["prize_name", "prize_value", "prize_rules"];

const AdminPrizes = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", PRIZE_KEYS);
    if (data) {
      const v: Record<string, string> = {};
      data.forEach((s) => { v[s.key] = s.value; });
      setValues(v);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const key of PRIZE_KEYS) {
      await supabase
        .from("app_settings")
        .update({ value: values[key] || "" })
        .eq("key", key);
    }
    toast({ title: "Prêmio atualizado com sucesso!" });
    setSaving(false);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Trophy size={24} className="text-primary" />
        Prêmios
      </h1>

      <div className="rounded-2xl bg-card shadow-card p-6 max-w-lg space-y-5">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">Nome do Prêmio</label>
          <input
            type="text"
            value={values.prize_name || ""}
            onChange={(e) => setValues((v) => ({ ...v, prize_name: e.target.value }))}
            placeholder="Ex: Kit Premium VTEX Day"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">Valor do Prêmio</label>
          <input
            type="text"
            value={values.prize_value || ""}
            onChange={(e) => setValues((v) => ({ ...v, prize_value: e.target.value }))}
            placeholder="Ex: R$ 12.000"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">Regras da Premiação</label>
          <textarea
            value={values.prize_rules || ""}
            onChange={(e) => setValues((v) => ({ ...v, prize_rules: e.target.value }))}
            rows={5}
            placeholder="Descreva as regras de premiação..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
        >
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar Prêmio"}
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminPrizes;
