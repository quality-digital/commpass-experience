import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sanitizeSupabaseError } from "@/lib/sanitizeError";

type Brand = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string | null;
  tags: string[];
  website: string | null;
  video_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  icon_url: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
};

const emptyBrand: Partial<Brand> = {
  slug: "", name: "", description: "", tagline: "", tags: [],
  website: "", video_url: "", instagram_url: "", linkedin_url: "", logo_url: "", icon_url: "",
  color: "from-blue-400 to-blue-500", is_active: true, sort_order: 0,
};

const AdminBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("brands").select("*").order("sort_order");
    if (data) setBrands(data.map((b: any) => ({ ...b, tags: Array.isArray(b.tags) ? b.tags : [] })) as Brand[]);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      slug: editing.slug!,
      name: editing.name!,
      description: editing.description!,
      tagline: editing.tagline || null,
      tags: editing.tags || [],
      website: editing.website || null,
      video_url: editing.video_url || null,
      instagram_url: editing.instagram_url || null,
      linkedin_url: editing.linkedin_url || null,
      logo_url: editing.logo_url || null,
      icon_url: editing.icon_url || null,
      color: editing.color || null,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("brands").insert(payload);
      if (error) { toast({ title: "Erro", description: sanitizeSupabaseError(error), variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("brands").update(payload).eq("id", editing.id!);
      if (error) { toast({ title: "Erro", description: sanitizeSupabaseError(error), variant: "destructive" }); return; }
    }
    toast({ title: isNew ? "Marca criada" : "Marca atualizada" });
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta marca?")) return;
    await supabase.from("brands").delete().eq("id", id);
    toast({ title: "Marca excluída" });
    load();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "icon_url") => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const setLoading = field === "logo_url" ? setUploading : setUploadingIcon;
    setLoading(true);
    const ext = file.name.split(".").pop();
    const path = `${editing.slug || "brand"}-${field === "icon_url" ? "icon" : "logo"}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("brand-logos").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload", description: sanitizeSupabaseError(error), variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
    update(field, urlData.publicUrl);
    setLoading(false);
    toast({ title: field === "icon_url" ? "Ícone enviado!" : "Logo enviado!" });
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || !editing) return;
    const current = editing.tags || [];
    if (!current.includes(v)) {
      update("tags", [...current, v]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!editing) return;
    update("tags", (editing.tags || []).filter((t) => t !== tag));
  };

  const update = (key: string, value: any) => setEditing((p) => p ? { ...p, [key]: value } : null);

  const textFields = [
    { key: "slug", label: "Slug" },
    { key: "name", label: "Nome" },
    { key: "tagline", label: "Tagline" },
    { key: "website", label: "Website" },
    { key: "video_url", label: "URL do Vídeo (YouTube)" },
    { key: "instagram_url", label: "Instagram URL" },
    { key: "linkedin_url", label: "LinkedIn URL" },
    { key: "color", label: "Cor (classes Tailwind)" },
    { key: "sort_order", label: "Ordem", type: "number" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Marcas</h1>
        <button onClick={() => { setEditing({ ...emptyBrand }); setIsNew(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold">
          <Plus size={16} /> Nova Marca
        </button>
      </div>

      {editing && (
        <div className="p-6 rounded-2xl bg-card shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">{isNew ? "Nova Marca" : "Editar Marca"}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground"><X size={20} /></button>
          </div>

          {/* Logo upload */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Logo da Marca</label>
            <div className="flex items-center gap-4">
              {editing.logo_url && (
                <img src={editing.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border" />
              )}
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border cursor-pointer hover:bg-accent/50 text-sm text-foreground">
                <Upload size={14} /> {uploading ? "Enviando..." : "Enviar Logo"}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo_url")} className="hidden" disabled={uploading} />
              </label>
              {editing.logo_url && (
                <button onClick={() => update("logo_url", "")} className="text-xs text-destructive">Remover</button>
              )}
            </div>
          </div>

          {/* Icon upload */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ícone da Marca (usado nas tabs)</label>
            <div className="flex items-center gap-4">
              {editing.icon_url && (
                <img src={editing.icon_url} alt="Ícone" className="w-10 h-10 object-contain rounded-lg border border-border" />
              )}
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border cursor-pointer hover:bg-accent/50 text-sm text-foreground">
                <Upload size={14} /> {uploadingIcon ? "Enviando..." : "Enviar Ícone"}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "icon_url")} className="hidden" disabled={uploadingIcon} />
              </label>
              {editing.icon_url && (
                <button onClick={() => update("icon_url", "")} className="text-xs text-destructive">Remover</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {textFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={(editing as any)[f.key] || ""}
                  onChange={(e) => update(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
            ))}

            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
              <textarea value={editing.description || ""} onChange={(e) => update("description", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>

            {/* Tags */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tags (Soluções)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(editing.tags || []).map((tag, idx) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <button
                      onClick={() => { if (idx > 0) { const t = [...(editing.tags || [])]; [t[idx - 1], t[idx]] = [t[idx], t[idx - 1]]; update("tags", t); } }}
                      disabled={idx === 0}
                      className="hover:text-foreground disabled:opacity-30"
                      title="Mover para esquerda"
                    >◀</button>
                    {tag}
                    <button
                      onClick={() => { const tags = editing.tags || []; if (idx < tags.length - 1) { const t = [...tags]; [t[idx], t[idx + 1]] = [t[idx + 1], t[idx]]; update("tags", t); } }}
                      disabled={idx === (editing.tags || []).length - 1}
                      className="hover:text-foreground disabled:opacity-30"
                      title="Mover para direita"
                    >▶</button>
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Adicionar tag..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
                <button onClick={addTag} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Adicionar</button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => update("is_active", e.target.checked)} />
              <span className="text-sm text-foreground">Ativa</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold">Salvar</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Marca</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Tagline</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Tags</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground flex items-center gap-2">
                  {b.icon_url ? <img src={b.icon_url} alt="" className="w-6 h-6 object-contain" /> : b.logo_url ? <img src={b.logo_url} alt="" className="w-6 h-6 object-contain" /> : null}
                  {b.name}
                </td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{b.tagline || "-"}</td>
                <td className="p-3 text-muted-foreground">{b.tags.length} tags</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {b.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({ ...b }); setIsNew(false); }} className="text-muted-foreground hover:text-foreground mr-2"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminBrands;
