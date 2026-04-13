import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const ONBOARDING_KEYS = [
  { key: "onboarding_title", label: "Título da página", placeholder: "Cadastro Concluído!" },
  { key: "onboarding_subtitle", label: "Subtítulo", placeholder: "Você está a bordo!" },
  { key: "onboarding_message", label: "Mensagem personalizada", placeholder: "Bem-vindo(a) ao Comm Pass, {name}!", help: "Use {name} para inserir o nome do usuário" },
];

const AdminOnboarding = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ONBOARDING_KEYS.map((k) => k.key));
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d) => (map[d.key] = d.value));
        setValues(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of ONBOARDING_KEYS) {
        const val = values[item.key] || "";
        await supabase.from("app_settings").update({ value: val }).eq("key", item.key);
      }
      toast({ title: "Conteúdo salvo!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><p className="text-muted-foreground">Carregando...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Tela de Onboarding</h1>
          <p className="text-sm text-muted-foreground">Configure os textos exibidos na tela de conclusão do cadastro</p>
        </div>

        <div className="space-y-4 p-6 rounded-xl bg-card border border-border">
          {ONBOARDING_KEYS.map((item) => (
            <div key={item.key}>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">{item.label}</label>
              <input
                value={values[item.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                placeholder={item.placeholder}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              {item.help && <p className="text-xs text-muted-foreground mt-1">{item.help}</p>}
            </div>
          ))}

          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 mt-4">
            <Save size={14} /> {saving ? "Salvando..." : "Salvar Conteúdo"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOnboarding;
