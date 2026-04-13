import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, Dices, Plus, Trash2, Pencil, X, Upload, Eye, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Types ──
type ConfigItem = { id: string; key: string; value: string; type: string; description: string | null };
type Prize = {
  id: string; label: string; value: number; weight: number;
  color: string; icon_url: string | null; sort_order: number; is_active: boolean;
};
type Spin = {
  id: string; email: string; prize_label: string; prize_value: number;
  qr_id: string; status: string; redeemed_at: string | null; created_at: string;
};

// ── Config Tab ──
const ConfigTab = () => {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("roulette_config").select("*").order("key");
    if (data) setItems(data as ConfigItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveItem = async (item: ConfigItem, newValue: string) => {
    setSaving(item.id);
    await supabase.from("roulette_config").update({ value: newValue }).eq("id", item.id);
    toast({ title: `"${item.description || item.key}" atualizado!` });
    setSaving(null);
    load();
  };

  const handleImageUpload = async (item: ConfigItem, file: File) => {
    setSaving(item.id);
    const ext = file.name.split(".").pop();
    const path = `config-${item.key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("roulette-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
      setSaving(null);
      return;
    }
    const { data } = supabase.storage.from("roulette-assets").getPublicUrl(path);
    await saveItem(item, data.publicUrl);
  };

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>;

  const textItems = items.filter((i) => i.type === "text");
  const imageItems = items.filter((i) => i.type === "image");

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-foreground">Textos e Labels</h3>
      <div className="space-y-3">
        {textItems.map((item) => (
          <div key={item.id} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {item.description || item.key}
              </label>
              <Input
                defaultValue={item.value}
                onBlur={(e) => {
                  if (e.target.value !== item.value) saveItem(item, e.target.value);
                }}
              />
            </div>
            {saving === item.id && <Loader />}
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-foreground mt-8">Imagens / Logos</h3>
      <div className="space-y-3">
        {imageItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.description || item.key}</p>
              {item.value ? (
                <img src={item.value} alt="" className="h-12 mt-2 object-contain rounded" />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Nenhuma imagem</p>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => { fileRefs.current[item.id] = el; }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(item, f);
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRefs.current[item.id]?.click()}>
              <Upload size={14} className="mr-1" /> Upload
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Loader = () => <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

// ── Prizes Tab ──
const PrizesTab = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", value: 0, weight: 1, color: "#1a1a2e", sort_order: 0 });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("roulette_prizes").select("*").order("sort_order");
    if (data) setPrizes(data as Prize[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ label: "", value: 0, weight: 1, color: "#1a1a2e", sort_order: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast({ title: "Label é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, label: form.label.trim() };

    if (editingId) {
      await supabase.from("roulette_prizes").update(payload).eq("id", editingId);
      toast({ title: "Prêmio atualizado!" });
    } else {
      await supabase.from("roulette_prizes").insert(payload);
      toast({ title: "Prêmio criado!" });
    }
    setSaving(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este prêmio?")) return;
    await supabase.from("roulette_prizes").delete().eq("id", id);
    toast({ title: "Prêmio excluído!" });
    load();
  };

  const handleEdit = (p: Prize) => {
    setForm({ label: p.label, value: p.value, weight: p.weight, color: p.color, sort_order: p.sort_order });
    setEditingId(p.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {!showForm && (
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus size={16} /> Novo Prêmio
        </Button>
      )}

      {showForm && (
        <div className="rounded-2xl bg-card shadow-card p-5 border border-border space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">{editingId ? "Editar" : "Novo"} Prêmio</h3>
            <button onClick={resetForm}><X size={18} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Label (ex: 1.000)</label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Valor (pontos)</label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Peso (probabilidade)</label>
              <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Cor</label>
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Ordem</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
            <Save size={16} /> {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {prizes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{p.label} pts ({p.value})</p>
                <p className="text-xs text-muted-foreground">Peso: {p.weight} · Ordem: {p.sort_order}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Spins/QR Tab ──
const SpinsTab = () => {
  const [spins, setSpins] = useState<Spin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("roulette_spins").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setSpins(data as Spin[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-foreground">QR Codes Gerados</h3>
        <Button size="sm" variant="outline" onClick={load} className="gap-1"><RefreshCw size={14} /> Atualizar</Button>
        <span className="text-xs text-muted-foreground">{spins.length} registros</span>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : spins.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum giro registrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">E-mail</th>
                <th className="pb-2 font-medium text-muted-foreground">Prêmio</th>
                <th className="pb-2 font-medium text-muted-foreground">Valor</th>
                <th className="pb-2 font-medium text-muted-foreground">Status</th>
                <th className="pb-2 font-medium text-muted-foreground">Data</th>
                <th className="pb-2 font-medium text-muted-foreground">QR ID</th>
              </tr>
            </thead>
            <tbody>
              {spins.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2 pr-3">{s.email}</td>
                  <td className="py-2 pr-3">{s.prize_label}</td>
                  <td className="py-2 pr-3 font-semibold">{s.prize_value}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === "redeemed"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {s.status === "redeemed" ? "Resgatado" : "Pendente"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground text-xs">
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{s.qr_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main Admin Page ──
const AdminRoulette = () => {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Dices size={24} className="text-primary" />
          Roleta de Prêmios
        </h1>
        <a href="/roulette" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <Eye size={16} /> Ver Roleta
          </Button>
        </a>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="prizes">Prêmios</TabsTrigger>
          <TabsTrigger value="spins">QR Codes Gerados</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
        <TabsContent value="prizes" className="mt-4"><PrizesTab /></TabsContent>
        <TabsContent value="spins" className="mt-4"><SpinsTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminRoulette;
