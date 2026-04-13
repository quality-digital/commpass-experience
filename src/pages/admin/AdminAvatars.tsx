import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAllAvatars, type Avatar } from "@/hooks/useAvatars";
import { toast } from "@/hooks/use-toast";
import { sanitizeSupabaseError } from "@/lib/sanitizeError";
import { Plus, Pencil, Trash2, Save, X, GripVertical, Egg } from "lucide-react";

type FormData = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_easter_egg: boolean;
  is_active: boolean;
};

const emptyForm: FormData = {
  slug: "",
  name: "",
  description: "",
  emoji: "👤",
  color: "from-gray-400 to-gray-500",
  image_url: "",
  sort_order: 0,
  is_easter_egg: false,
  is_active: true,
};

const AdminAvatars = () => {
  const { data: avatars = [], isLoading } = useAllAvatars();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const startEdit = (av: Avatar) => {
    setEditing(av.id);
    setCreating(false);
    setForm({
      slug: av.slug,
      name: av.name,
      description: av.description,
      emoji: av.emoji,
      color: av.color,
      image_url: av.image_url || "",
      sort_order: av.sort_order,
      is_easter_egg: av.is_easter_egg,
      is_active: av.is_active,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    const maxOrder = avatars.length > 0 ? Math.max(...avatars.map((a) => a.sort_order)) : 0;
    setForm({ ...emptyForm, sort_order: maxOrder + 1 });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        emoji: form.emoji.trim(),
        color: form.color.trim(),
        image_url: form.image_url.trim() || null,
        sort_order: form.sort_order,
        is_easter_egg: form.is_easter_egg,
        is_active: form.is_active,
      };

      if (creating) {
        const { error } = await supabase.from("avatars").insert(payload);
        if (error) throw error;
        toast({ title: "Avatar criado!" });
      } else if (editing) {
        const { error } = await supabase.from("avatars").update(payload).eq("id", editing);
        if (error) throw error;
        toast({ title: "Avatar atualizado!" });
      }

      queryClient.invalidateQueries({ queryKey: ["avatars"] });
      cancel();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este avatar?")) return;
    const { error } = await supabase.from("avatars").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: sanitizeSupabaseError(error), variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["avatars"] });
    toast({ title: "Avatar excluído!" });
  };

  const renderForm = () => (
    <div className="p-4 rounded-xl bg-card border border-border space-y-4 mb-6">
      <h3 className="font-bold text-foreground">{creating ? "Novo Avatar" : "Editar Avatar"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Slug (identificador)</label>
          <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="meu-avatar" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="Nome do avatar" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Descrição</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="Descrição exibida ao selecionar" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Emoji</label>
          <input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Cor (gradiente CSS)</label>
          <input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="from-blue-400 to-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Posição</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Imagem</label>
          {form.image_url && <img src={form.image_url} alt="preview" className="w-16 h-16 rounded-xl object-cover" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="text-xs" disabled={uploadingImage} />
          {uploadingImage && <span className="text-xs text-muted-foreground">Enviando...</span>}
        </div>
        <div className="flex items-center gap-6 col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_easter_egg} onChange={(e) => setForm((f) => ({ ...f, is_easter_egg: e.target.checked }))} className="rounded" />
            <Egg size={14} className="text-green-500" /> É Easter Egg
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            Ativo
          </label>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={cancel} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm flex items-center gap-1">
          <X size={14} /> Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1">
          <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avatares</h1>
            <p className="text-sm text-muted-foreground">Gerencie os avatares disponíveis no cadastro</p>
          </div>
          <button onClick={startCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1">
            <Plus size={16} /> Novo Avatar
          </button>
        </div>

        {(creating || editing) && renderForm()}

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {avatars.map((av) => (
              <div key={av.id} className={`flex items-center gap-4 p-4 rounded-xl border ${av.is_active ? "bg-card border-border" : "bg-secondary/50 border-border/50 opacity-60"}`}>
                <GripVertical size={16} className="text-muted-foreground" />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {av.image_url ? (
                    <img src={av.image_url} alt={av.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${av.color} flex items-center justify-center text-2xl`}>
                      {av.emoji}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{av.name}</span>
                      <span className="text-xs text-muted-foreground">({av.slug})</span>
                      {av.is_easter_egg && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">Easter Egg</span>
                      )}
                      {!av.is_active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-muted-foreground">Inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{av.description}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">#{av.sort_order}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(av)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(av.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                    <Trash2 size={14} />
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

export default AdminAvatars;
