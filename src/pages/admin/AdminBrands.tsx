import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Brand = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cases: string | null;
  website: string | null;
  color: string | null;
  emoji: string | null;
  is_active: boolean;
  sort_order: number;
};

const emptyBrand = { slug: "", name: "", description: "", cases: "", website: "", color: "from-blue-400 to-blue-500", emoji: "", is_active: true, sort_order: 0 };

const AdminBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("brands").select("*").order("sort_order");
    if (data) setBrands(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      slug: editing.slug!,
      name: editing.name!,
      description: editing.description!,
      cases: editing.cases || null,
      website: editing.website || null,
      color: editing.color || null,
      emoji: editing.emoji || null,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("brands").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("brands").update(payload).eq("id", editing.id!);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
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

  const update = (key: string, value: any) => setEditing((p) => p ? { ...p, [key]: value } : null);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Marcas</h1>
        <button onClick={() => { setEditing(emptyBrand); setIsNew(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold">
          <Plus size={16} /> Nova Marca
        </button>
      </div>

      {editing && (
        <div className="p-6 rounded-2xl bg-card shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">{isNew ? "Nova Marca" : "Editar Marca"}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "slug", label: "Slug" },
              { key: "name", label: "Nome" },
              { key: "website", label: "Website" },
              { key: "emoji", label: "Emoji" },
              { key: "color", label: "Cor (classes Tailwind)" },
              { key: "sort_order", label: "Ordem", type: "number" },
            ].map((f) => (
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
              <textarea value={editing.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cases</label>
              <textarea value={editing.cases || ""} onChange={(e) => update("cases", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
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
              <th className="text-left p-3 text-muted-foreground font-medium">Descrição</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground flex items-center gap-2">
                  <span className="text-lg">{b.emoji}</span> {b.name}
                </td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{b.description}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {b.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing(b); setIsNew(false); }} className="text-muted-foreground hover:text-foreground mr-2"><Pencil size={14} /></button>
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
