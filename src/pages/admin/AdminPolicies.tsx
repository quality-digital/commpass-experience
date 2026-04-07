import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, Shield, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminPolicies = () => {
  const [privacy, setPrivacy] = useState("");
  const [terms, setTerms] = useState("");
  const [privacyId, setPrivacyId] = useState("");
  const [termsId, setTermsId] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"privacy" | "terms">("privacy");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["privacy_policy", "terms_of_use"]);
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "privacy_policy") { setPrivacy(s.value); setPrivacyId(s.id); }
          if (s.key === "terms_of_use") { setTerms(s.value); setTermsId(s.id); }
        });
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (privacyId) {
      await supabase.from("app_settings").update({ value: privacy }).eq("id", privacyId);
    }
    if (termsId) {
      await supabase.from("app_settings").update({ value: terms }).eq("id", termsId);
    }
    toast({ title: "Textos salvos com sucesso!" });
    setSaving(false);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Políticas & Termos</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("privacy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "privacy" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <Shield size={14} />
          Política de Privacidade
        </button>
        <button
          onClick={() => setTab("terms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "terms" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <FileText size={14} />
          Termos de Uso
        </button>
      </div>

      <div className="rounded-2xl bg-card shadow-card p-6 max-w-3xl">
        <p className="text-xs text-muted-foreground mb-3">
          Use Markdown para formatar: # Título, ## Subtítulo, texto normal para parágrafos.
        </p>
        <textarea
          value={tab === "privacy" ? privacy : terms}
          onChange={(e) => tab === "privacy" ? setPrivacy(e.target.value) : setTerms(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder={tab === "privacy" ? "Texto da Política de Privacidade..." : "Texto dos Termos de Uso..."}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
        >
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar Textos"}
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminPolicies;
