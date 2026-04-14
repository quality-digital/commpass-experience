import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Download, Trash2, RefreshCw, FileArchive } from "lucide-react";

type ZipFile = {
  name: string;
  created_at: string;
  metadata: { size?: number };
};

const AdminExports = () => {
  const [files, setFiles] = useState<ZipFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("project-exports").list("", {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      toast({ title: "Erro ao carregar arquivos", description: error.message, variant: "destructive" });
    } else {
      setFiles((data || []).filter((f) => f.name.endsWith(".zip")) as unknown as ZipFile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDownload = async (name: string) => {
    const { data, error } = await supabase.storage.from("project-exports").createSignedUrl(name, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar link", description: error?.message || "Tente novamente.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    const { error } = await supabase.storage.from("project-exports").remove([name]);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo excluído" });
      loadFiles();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}`;
      const fileName = `projeto_${ts}.zip`;

      // Fetch current zip to re-upload as a new snapshot
      const existing = files[0];
      if (!existing) {
        toast({ title: "Nenhum ZIP base encontrado", description: "Solicite a geração via chat primeiro.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const { data: dlData, error: dlError } = await supabase.storage
        .from("project-exports")
        .download(existing.name);

      if (dlError || !dlData) {
        toast({ title: "Erro ao gerar", description: dlError?.message || "Falha no download base.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const { error: upError } = await supabase.storage
        .from("project-exports")
        .upload(fileName, dlData, { contentType: "application/zip" });

      if (upError) {
        toast({ title: "Erro ao salvar", description: upError.message, variant: "destructive" });
      } else {
        toast({ title: "ZIP gerado com sucesso!", description: fileName });
        loadFiles();
      }
    } catch (err) {
      toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR");
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exportar Projeto</h1>
            <p className="text-sm text-muted-foreground">Gerencie os arquivos ZIP do projeto</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadFiles}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              <FileArchive size={14} />
              {generating ? "Gerando..." : "Gerar novo ZIP"}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileArchive size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum arquivo ZIP disponível.</p>
            <p className="text-xs mt-1">Solicite a geração via chat ou clique em "Gerar novo ZIP".</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <FileArchive size={20} className="text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gerado em: {formatDate(file.created_at)} · {formatSize((file as any).metadata?.size)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleDownload(file.name)}
                    className="p-2 rounded-lg hover:bg-secondary text-primary"
                    title="Baixar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminExports;
