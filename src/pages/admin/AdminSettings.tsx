import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Setting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("*").order("key");
    if (data) {
      setSettings(data as Setting[]);
      const v: Record<string, string> = {};
      data.forEach((s: any) => { v[s.key] = s.value; });
      setValues(v);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      if (values[s.key] !== s.value) {
        await supabase.from("app_settings").update({ value: values[s.key] }).eq("id", s.id);
      }
    }
    toast({ title: "Configurações salvas!" });
    setSaving(false);
    load();
  };

  const labelMap: Record<string, string> = {
    ranking_min_points: "Pontos mínimos para Ranking",
    golden_pass_min_points: "Pontos mínimos para Golden Pass",
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Configurações</h1>

      <div className="rounded-2xl bg-card shadow-card p-6 max-w-lg">
        <div className="space-y-5">
          {settings.map((s) => (
            <div key={s.key}>
              <label className="text-sm font-semibold text-foreground block mb-1">
                {labelMap[s.key] || s.key}
              </label>
              {s.description && (
                <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
              )}
              <input
                type="number"
                value={values[s.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
        >
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
