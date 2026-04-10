import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useAvatars, findAvatarBySlug, type Avatar } from "@/hooks/useAvatars";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ChevronRight, Shield, Pencil, X, Save, Check, FileText, Receipt } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";
import PointsStatement from "@/components/PointsStatement";

const Profile = () => {
  const { profile, logout, isAdmin, getCompletedMissions, refreshProfile, addPoints, session } = useUser();
  const navigate = useNavigate();
  const { data: avatars = [] } = useAvatars();
  const [missions, setMissions] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [easterEggModal, setEasterEggModal] = useState(false);
  const [easterEggPoints, setEasterEggPoints] = useState(0);
  const [form, setForm] = useState({ phone: "", company: "", role: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

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

  const avatar = findAvatarBySlug(avatars, profile.avatar_id);
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

  const handleAvatarSave = async () => {
    if (!selectedAvatar || !session?.user) return;
    setSavingAvatar(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_id: selectedAvatar.slug,
        avatar_emoji: selectedAvatar.emoji,
      })
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Erro ao salvar avatar", description: error.message, variant: "destructive" });
      setSavingAvatar(false);
      return;
    }

    // Check if selecting an easter egg avatar triggers the mission
    if (selectedAvatar.is_easter_egg && profile.avatar_id !== selectedAvatar.slug) {
      const { data: easterMission } = await supabase
        .from("missions")
        .select("id, points")
        .eq("slug", "easter-egg-avatar")
        .single();

      if (easterMission) {
        const { data: existing } = await supabase
          .from("user_missions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("mission_id", easterMission.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("user_missions").insert({
            user_id: session.user.id,
            mission_id: easterMission.id,
            status: "completed",
          });
          await addPoints(easterMission.points);
          fireConfetti();
          setEasterEggPoints(easterMission.points);
          await refreshProfile();
          setEditingAvatar(false);
          setSelectedAvatar(null);
          setSavingAvatar(false);
          setEasterEggModal(true);
          return;
        }
      }
    }

    await refreshProfile();
    setEditingAvatar(false);
    setSelectedAvatar(null);
    setSavingAvatar(false);
    toast({ title: "Avatar atualizado!" });
  };

  const renderAvatarVisual = (av: { image_url?: string | null; color: string; emoji: string; name?: string }, size: string, textSize: string) => {
    if (av.image_url) {
      return <img src={av.image_url} alt={av.name || ""} className={`${size} rounded-xl object-cover`} />;
    }
    return (
      <div className={`${size} rounded-xl bg-gradient-to-br ${av.color} flex items-center justify-center ${textSize}`}>
        {av.emoji}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-6">
          <button
            onClick={() => { setEditingAvatar(true); setSelectedAvatar(avatar || null); }}
            className="relative group"
          >
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatar?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-4xl shadow-card mb-1 transition-transform group-hover:scale-105 overflow-hidden`}>
              {avatar?.image_url ? (
                <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover" />
              ) : (
                avatar?.emoji || profile.avatar_emoji || "👤"
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Pencil size={12} className="text-primary-foreground" />
            </div>
          </button>
          <p className="text-xs text-primary font-medium mt-2 mb-1">Trocar avatar</p>
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

        <button
          onClick={() => setStatementOpen(true)}
          className="w-full p-4 rounded-2xl bg-card shadow-card flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <Receipt size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Extrato de Pontos</p>
              <p className="text-xs text-muted-foreground">Veja todo o histórico de movimentações</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

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

        <div className="rounded-2xl bg-card shadow-card mb-4 overflow-hidden">
          <button
            onClick={() => navigate("/policies?tab=privacy")}
            className="w-full p-4 flex items-center justify-between border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary" />
              <p className="font-semibold text-foreground text-sm">Política de Privacidade</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/policies?tab=terms")}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-primary" />
              <p className="font-semibold text-foreground text-sm">Termos de Uso</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl border border-destructive/20 flex items-center justify-center gap-2 text-destructive font-semibold text-sm mb-6"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {editingAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 z-50 flex items-end justify-center"
            onClick={() => { setEditingAvatar(false); setSelectedAvatar(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-24 max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Escolha seu Avatar</h2>
                <button onClick={() => { setEditingAvatar(false); setSelectedAvatar(null); }} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {avatars.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar(av)}
                    className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedAvatar?.id === av.id
                        ? "bg-primary/10 ring-2 ring-primary shadow-card"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    {selectedAvatar?.id === av.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={12} className="text-primary-foreground" />
                      </div>
                    )}
                    {renderAvatarVisual(av, "w-14 h-14", "text-2xl")}
                    <span className="text-xs font-medium text-foreground">{av.name}</span>
                  </button>
                ))}
              </div>

              {selectedAvatar && (
                <div className="p-3 rounded-xl bg-secondary/50 flex items-center gap-3 mb-4">
                  {renderAvatarVisual(selectedAvatar, "w-10 h-10", "text-lg")}
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selectedAvatar.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAvatar.is_easter_egg && profile.avatar_id !== selectedAvatar.slug
                        ? "🎉 Surpresa especial ao selecionar!"
                        : selectedAvatar.description || "Seu novo avatar"}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleAvatarSave}
                disabled={!selectedAvatar || selectedAvatar.slug === profile.avatar_id || savingAvatar}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 ${
                  selectedAvatar && selectedAvatar.slug !== profile.avatar_id && !savingAvatar
                    ? "gradient-cta text-primary-foreground shadow-button"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {savingAvatar ? "Salvando..." : "Confirmar Avatar"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter Egg Celebration Modal */}
      <AnimatePresence>
        {easterEggModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/60 z-[60] flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-card"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-5xl mx-auto mb-5 shadow-lg overflow-hidden"
              >
                {selectedAvatar?.image_url ? (
                  <img src={selectedAvatar.image_url} alt="" className="w-full h-full object-cover" />
                ) : "🛒"}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-extrabold text-foreground mb-2"
              >
                🎉 Easter Egg Desbloqueado!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-sm mb-4"
              >
                Você encontrou o avatar secreto premiado! Como recompensa, a missão Easter Egg foi desbloqueada.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 mb-6"
              >
                <p className="text-3xl font-extrabold text-green-600">+{easterEggPoints}</p>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Pontos da Missão</p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-muted-foreground mb-6"
              >
                Missão secreta concluída! Continue explorando para ganhar mais pontos. Você pode trocar de avatar quando quiser sem perder os pontos.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={() => setEasterEggModal(false)}
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button"
              >
                Incrível! 🚀
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PointsStatement open={statementOpen} onClose={() => setStatementOpen(false)} />
    </AppLayout>
  );
};

export default Profile;
