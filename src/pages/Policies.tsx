import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Policies = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "privacy";
  const [privacy, setPrivacy] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["privacy_policy", "terms_of_use"]);
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "privacy_policy") setPrivacy(s.value);
          if (s.key === "terms_of_use") setTerms(s.value);
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const content = tab === "privacy" ? privacy : terms;

  // Simple markdown-like renderer
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <div key={i} className="flex items-start gap-3 mt-6 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={14} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-base">{line.replace("## ", "")}</h3>
          </div>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <div key={i} className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield size={14} className="text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-lg">{line.replace("# ", "")}</h2>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <div key={i} className="p-4 rounded-2xl bg-card shadow-card mb-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{line}</p>
        </div>
      );
    });
  };

  // Group content into sections for card-style layout
  const renderSections = (text: string) => {
    const sections: { title: string; icon: "shield" | "file"; lines: string[] }[] = [];
    let current: { title: string; icon: "shield" | "file"; lines: string[] } | null = null;

    text.split("\n").forEach((line) => {
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        current = { title: line.replace("# ", ""), icon: "shield", lines: [] };
        sections.push(current);
      } else if (line.startsWith("## ")) {
        current = { title: line.replace("## ", ""), icon: "file", lines: [] };
        sections.push(current);
      } else if (line.trim() !== "" && current) {
        current.lines.push(line);
      } else if (line.trim() !== "") {
        current = { title: "", icon: "file", lines: [line] };
        sections.push(current);
      }
    });

    return sections.map((section, i) => (
      <div key={i} className="p-4 rounded-2xl bg-card shadow-card mb-3">
        {section.title && (
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {section.icon === "shield" ? (
                <Shield size={14} className="text-primary" />
              ) : (
                <FileText size={14} className="text-primary" />
              )}
            </div>
            <h3 className="font-bold text-foreground text-base leading-8">{section.title}</h3>
          </div>
        )}
        {section.lines.map((line, j) => (
          <p key={j} className="text-sm text-muted-foreground leading-relaxed mt-1">{line}</p>
        ))}
      </div>
    ));
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-4">
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Políticas & Termos</h1>
        <p className="text-sm text-primary mb-5">Conformidade LGPD e Regras da Campanha</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => navigate("/policies?tab=privacy", { replace: true })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "privacy"
                ? "gradient-cta text-primary-foreground shadow-button"
                : "bg-card text-muted-foreground border border-border"
            }`}
          >
            Política de Privacidade
          </button>
          <button
            onClick={() => navigate("/policies?tab=terms", { replace: true })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "terms"
                ? "gradient-cta text-primary-foreground shadow-button"
                : "bg-card text-muted-foreground border border-border"
            }`}
          >
            Termos de Uso
          </button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div>{renderSections(content)}</div>
        )}
      </div>
    </AppLayout>
  );
};

export default Policies;
