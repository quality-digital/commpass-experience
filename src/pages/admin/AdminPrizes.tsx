import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, Trophy, Plus, Trash2, Pencil, X, Upload, Image, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Prize {
  id: string;
  position: number;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

interface PrizeForm {
  position: number;
  name: string;
  description: string;
  image_url: string | null;
  imageFile: File | null;
}

const emptyForm: PrizeForm = { position: 1, name: "", description: "", image_url: null, imageFile: null };

const AdminPrizes = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrizeForm>({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [prizeRules, setPrizeRules] = useState("");
  const [savingRules, setSavingRules] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: prizesData }, { data: settings }] = await Promise.all([
      supabase.from("prizes").select("*").order("position", { ascending: true }),
      supabase.from("app_settings").select("key, value").eq("key", "prize_rules"),
    ]);
    if (prizesData) setPrizes(prizesData);
    if (settings && settings.length > 0) setPrizeRules(settings[0].value);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
  };

  const handleEdit = (prize: Prize) => {
    setForm({
      position: prize.position,
      name: prize.name,
      description: prize.description || "",
      image_url: prize.image_url,
      imageFile: null,
    });
    setImagePreview(prize.image_url);
    setEditingId(prize.id);
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `prize-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("prize-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("prize-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome do prêmio é obrigatório", variant: "destructive" });
      return;
    }
    if (form.position < 1) {
      toast({ title: "Posição deve ser maior que 0", variant: "destructive" });
      return;
    }

    // Check duplicate position
    const duplicate = prizes.find((p) => p.position === form.position && p.id !== editingId);
    if (duplicate) {
      toast({ title: `Já existe um prêmio na posição ${form.position}`, variant: "destructive" });
      return;
    }

    setSaving(true);

    let imageUrl = form.image_url;
    if (form.imageFile) {
      const url = await uploadImage(form.imageFile);
      if (!url) { setSaving(false); return; }
      imageUrl = url;
    }

    if (!imageUrl) {
      toast({ title: "Imagem do prêmio é obrigatória", variant: "destructive" });
      setSaving(false);
      return;
    }

    const payload = {
      position: form.position,
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: imageUrl,
      sort_order: form.position,
    };

    if (editingId) {
      const { error } = await supabase.from("prizes").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Prêmio atualizado!" });
      }
    } else {
      const { error } = await supabase.from("prizes").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Prêmio criado!" });
      }
    }

    setSaving(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prêmio?")) return;
    const { error } = await supabase.from("prizes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prêmio excluído!" });
      load();
    }
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    await supabase
      .from("app_settings")
      .update({ value: prizeRules })
      .eq("key", "prize_rules");
    toast({ title: "Regras atualizadas!" });
    setSavingRules(false);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy size={24} className="text-primary" />
          Prêmios
        </h1>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus size={16} /> Novo Prêmio
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl bg-card shadow-card p-6 max-w-lg space-y-4 mb-6 border border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{editingId ? "Editar Prêmio" : "Novo Prêmio"}</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Posição *</label>
              <Input
                type="number"
                min={1}
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: parseInt(e.target.value) || 1 }))}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Nome *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: iPhone 17"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Ex: 1º lugar no ranking geral"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Imagem do Prêmio *</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} className="hidden" />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[120px]"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para enviar imagem</p>
                </>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
            <Save size={16} />
            {saving ? "Salvando..." : editingId ? "Atualizar Prêmio" : "Criar Prêmio"}
          </Button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : prizes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum prêmio cadastrado</p>
          <p className="text-sm">Clique em "Novo Prêmio" para começar</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {prizes.map((prize) => (
            <div key={prize.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{prize.position}º</span>
              </div>
              {prize.image_url ? (
                <img src={prize.image_url} alt={prize.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Image size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{prize.name}</p>
                {prize.description && <p className="text-xs text-muted-foreground truncate">{prize.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleEdit(prize)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(prize.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regras da Promoção */}
      <div className="rounded-2xl bg-card shadow-card p-6 max-w-lg space-y-4 mt-8 border border-border">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">Regras da Promoção</h2>
        </div>
        <textarea
          value={prizeRules}
          onChange={(e) => setPrizeRules(e.target.value)}
          rows={6}
          placeholder="Descreva as regras da promoção..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
        <Button onClick={handleSaveRules} disabled={savingRules} className="gap-2">
          <Save size={16} />
          {savingRules ? "Salvando..." : "Salvar Regras"}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminPrizes;
