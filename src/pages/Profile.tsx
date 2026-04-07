import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser, AVATARS } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ChevronRight, Shield, Pencil, X, Save } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";

const Profile = () => {
  const { profile, logout, isAdmin, getCompletedMissions, refreshProfile, addPoints, session } = useUser();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: "", company: "", role: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("missions").select("id").eq("is_active", true);
      if (data) setMissions(data);
      const completed = await getCompletedMissions();
      setCompletedCount(completed.length);
    };
    load();
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone || "",
        company: profile.company || "",
        role: profile.role || "",
        city: profile.city || "",
      });
    }
  }, [profile]);

  if (!profile) return null;

  const avatar = AVATARS.find((a) => a.id === profile.avatar_id);
  const totalMissions = missions.length;
  const progress = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;
  const isQuickRegistration = profile.registration_type === "quick";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleSave = async () => {
    if (!form.phone.trim() || !form.company.trim() || !form.role.trim() || !form.city.trim()) {
      toast({ title: "Preencha todos os campos", description: "Todos os campos são obrigatórios para completar o cadastro.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        phone: form.phone,
        company: form.company,
        role: form.role,
        city: form.city,
        registration_type: "complete",
      })
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Complete the "cadastro-completo" mission if not already done
    if (isQuickRegistration && session?.user) {
      const { data: mission } = await supabase.from("missions").select("id, points").eq("slug", "cadastro-completo").single();
      if (mission) {
        const { data: existing } = await supabase
          .from("user_missions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("mission_id", mission.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("user_missions").insert({
            user_id: session.user.id,
            mission_id: mission.id,
            status: "completed",
          });
          await addPoints(mission.points);
          fireConfetti();
          toast({ title: "🎉 Missão concluída!", description: `Cadastro Completo: +${mission.points} pontos!` });
        }
      }
    }

    await refreshProfile();
    setEditing(false);
    setSaving(false);
    if (!isQuickRegistration) {
      toast({ title: "Perfil atualizado!" });
    }
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-4xl shadow-card mb-3`}>
            {avatar?.emoji || profile.avatar_emoji || "👤"}
          </div>
          <h2 className="font-bold text-foreground text-lg">{profile.name}</h2>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full gradient-points">
            <span className="text-sm font-bold text-primary-foreground">⚡ {profile.points} pts</span>
          </div>
        </motion.div>

        <div className="p-4 rounded-2xl bg-card shadow-card mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Progresso</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{completedCount}/{totalMissions} missões concluídas</p>
        </div>

        <div className="p-4 rounded-2xl bg-card shadow-card mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Informações</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Pencil size={12} /> Editar
              </button>
            )}
          </div>

          {!editing ? (
            <>
              {[
                { label: "Nome", value: profile.name },
                { label: "E-mail", value: profile.email },
                { label: "Telefone", value: profile.phone || "—" },
                { label: "Empresa", value: profile.company || "—" },
                { label: "Cargo", value: profile.role || "—" },
                { label: "Cidade", value: profile.city || "—" },
                { label: "Cadastro", value: profile.registration_type === "complete" ? "Completo" : "Rápido" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium">{item.value}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-3">
              {[
                { key: "phone", label: "Telefone", placeholder: "(11) 99999-9999" },
                { key: "company", label: "Empresa", placeholder: "Sua empresa" },
                { key: "role", label: "Cargo", placeholder: "Seu cargo" },
                { key: "city", label: "Cidade", placeholder: "Sua cidade" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{field.label}</label>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditing(false)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium">
                  <X size={14} /> Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl gradient-cta text-primary-foreground text-sm font-semibold shadow-button">
                  <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary" />
              <p className="font-semibold text-foreground text-sm">Painel Admin</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}

        {isQuickRegistration && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between mb-4"
          >
            <div>
              <p className="font-semibold text-foreground text-sm">Completar cadastro</p>
              <p className="text-xs text-primary">Preencha todos os campos e ganhe pontos!</p>
            </div>
            <ChevronRight size={18} className="text-primary" />
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl border border-destructive/20 flex items-center justify-center gap-2 text-destructive font-semibold text-sm mb-6"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
