import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sanitizeSupabaseError } from "@/lib/sanitizeError";

type Mission = {
  id: string;
  slug: string;
  name: string;
  description: string;
  points: number;
  type: string;
  difficulty: string;
  location: string | null;
  action: string | null;
  action_label: string | null;
  is_active: boolean;
  sort_order: number;
};

const emptyMission = {
  slug: "", name: "", description: "", points: 0, type: "digital",
  difficulty: "fácil", location: "", action: "", action_label: "", is_active: true, sort_order: 0,
};

const AdminMissions = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editing, setEditing] = useState<Partial<Mission> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragNode = useRef<HTMLTableRowElement | null>(null);

  const load = async () => {
    const { data } = await supabase.from("missions").select("*").order("sort_order");
    if (data) setMissions(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      slug: editing.slug!,
      name: editing.name!,
      description: editing.description!,
      points: editing.points || 0,
      type: editing.type!,
      difficulty: editing.difficulty!,
      location: editing.location || null,
      action: editing.action || null,
      action_label: editing.action_label || null,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("missions").insert(payload);
      if (error) { toast({ title: "Erro", description: sanitizeSupabaseError(error), variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("missions").update(payload).eq("id", editing.id!);
      if (error) { toast({ title: "Erro", description: sanitizeSupabaseError(error), variant: "destructive" }); return; }
    }
    toast({ title: isNew ? "Missão criada" : "Missão atualizada" });
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta missão?")) return;
    await supabase.from("missions").delete().eq("id", id);
    toast({ title: "Missão excluída" });
    load();
  };

  const update = (key: string, value: any) => setEditing((p) => p ? { ...p, [key]: value } : null);

  // Drag and drop handlers
  const handleDragStart = (index: number, e: React.DragEvent<HTMLTableRowElement>) => {
    setDragIndex(index);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    // Make the row semi-transparent while dragging
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (dragNode.current) dragNode.current.style.opacity = "1";

    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...missions];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);

      // Update local state immediately
      setMissions(reordered);

      // Persist new order
      setSavingOrder(true);
      const updates = reordered.map((m, i) =>
        supabase.from("missions").update({ sort_order: i }).eq("id", m.id)
      );
      await Promise.all(updates);
      setSavingOrder(false);
      toast({ title: "Ordem atualizada!" });
    }

    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  };

  const moveItem = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= missions.length) return;
    const reordered = [...missions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setMissions(reordered);

    setSavingOrder(true);
    const updates = reordered.map((m, i) =>
      supabase.from("missions").update({ sort_order: i }).eq("id", m.id)
    );
    await Promise.all(updates);
    setSavingOrder(false);
    toast({ title: "Ordem atualizada!" });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Missões</h1>
          {savingOrder && <p className="text-xs text-primary animate-pulse">Salvando ordem...</p>}
        </div>
        <button
          onClick={() => { setEditing(emptyMission); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
        >
          <Plus size={16} /> Nova Missão
        </button>
      </div>

      {editing && (
        <div className="p-6 rounded-2xl bg-card shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">{isNew ? "Nova Missão" : "Editar Missão"}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "slug", label: "Slug", type: "text" },
              { key: "name", label: "Nome", type: "text" },
              { key: "points", label: "Pontos", type: "number" },
              { key: "sort_order", label: "Ordem", type: "number" },
              { key: "location", label: "Local", type: "text" },
              { key: "action", label: "Ação", type: "text" },
              { key: "action_label", label: "Label da Ação", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type={f.type}
                  value={(editing as any)[f.key] || ""}
                  onChange={(e) => update(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo</label>
              <select value={editing.type || "digital"} onChange={(e) => update("type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="digital">Digital</option>
                <option value="presencial">Presencial</option>
                <option value="quiz">Quiz</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Dificuldade</label>
              <select value={editing.difficulty || "fácil"} onChange={(e) => update("difficulty", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="fácil">Fácil</option>
                <option value="médio">Médio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
              <textarea
                value={editing.description || ""}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
              <th className="w-10 p-3"></th>
              <th className="text-left p-3 text-muted-foreground font-medium">Ordem</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Tipo</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Pontos</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m, index) => (
              <tr
                key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(index, e)}
                onDragEnd={handleDragEnd}
                className={`border-b border-border last:border-0 transition-colors ${
                  overIndex === index && dragIndex !== null ? "bg-primary/10" : ""
                } ${dragIndex === index ? "opacity-40" : ""}`}
              >
                <td className="p-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <GripVertical size={16} className="text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0 || savingOrder}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        title="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === missions.length - 1 || savingOrder}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        title="Mover para baixo"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-center font-mono text-xs">{index + 1}</td>
                <td className="p-3 font-medium text-foreground">{m.name}</td>
                <td className="p-3 text-muted-foreground capitalize">{m.type}</td>
                <td className="p-3 text-primary font-bold">+{m.points}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {m.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing(m); setIsNew(false); }} className="text-muted-foreground hover:text-foreground mr-2"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminMissions;
