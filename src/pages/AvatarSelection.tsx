import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useAvatars, findAvatarBySlug, type Avatar } from "@/hooks/useAvatars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { clearPendingRegistrationPassword, getPendingRegistrationPassword } from "@/lib/registration";

const translateAuthError = (message?: string) => {
  const normalized = message?.toLowerCase() || "";
  if (normalized.includes("already registered")) return "Este e-mail já está cadastrado.";
  if (normalized.includes("email not confirmed")) return "Sua conta foi criada, mas o e-mail ainda precisa ser confirmado para liberar o acesso.";
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("weak") || normalized.includes("password")) return "A senha não atende aos requisitos. Use no mínimo 6 caracteres com letras e números.";
  if (normalized.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return message || "Tente novamente.";
};

const AvatarSelection = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useUser();
  const { data: avatars = [], isLoading: loadingAvatars } = useAvatars();
  const [selected, setSelected] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore previously selected avatar from sessionStorage
  useEffect(() => {
    if (avatars.length === 0) return;
    const raw = sessionStorage.getItem("registration_data");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.selectedAvatarSlug) {
        const av = findAvatarBySlug(avatars, data.selectedAvatarSlug);
        if (av) setSelected(av);
      }
    }
  }, [avatars]);

  // Save selected avatar to sessionStorage
  useEffect(() => {
    if (selected) {
      const raw = sessionStorage.getItem("registration_data");
      if (raw) {
        const data = JSON.parse(raw);
        data.selectedAvatarSlug = selected.slug;
        sessionStorage.setItem("registration_data", JSON.stringify(data));
      }
    }
  }, [selected]);

  const handleConfirm = async () => {
    if (!selected || loading) return;
    setLoading(true);

    try {
      const raw = sessionStorage.getItem("registration_data");
      if (!raw) {
        toast({ title: "Cadastro não encontrado", description: "Preencha seus dados novamente para continuar.", variant: "destructive" });
        navigate("/register-type", { replace: true });
        return;
      }

      const data = JSON.parse(raw);
      const password = getPendingRegistrationPassword();

      if (!password) {
        toast({ title: "Erro", description: "Por segurança, sua senha não foi mantida após sair da etapa anterior. Volte e preencha novamente.", variant: "destructive" });
        navigate(-1);
        return;
      }

      if (!data?.email || !data?.name) {
        toast({ title: "Dados incompletos", description: "Revise o cadastro antes de finalizar.", variant: "destructive" });
        navigate(-1);
        return;
      }

      const isComplete = data.type === "complete";

      // SECURITY: Only send minimal data to user_metadata (name for trigger).
      // All business data goes through complete_registration RPC only.

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password,
        options: { data: { name: data.name } },
      });

      if (authError || !authData.user) {
        console.error("[AvatarSelection] Erro ao criar usuário", authError);
        toast({ title: "Erro ao criar conta", description: translateAuthError(authError?.message), variant: "destructive" });
        return;
      }

      let activeSession = authData.session;

      if (!activeSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email.trim().toLowerCase(),
          password,
        });

        if (signInError) {
          console.error("[AvatarSelection] Erro ao autenticar usuário recém-criado", signInError);
          toast({ title: "Conta criada, mas o acesso não foi concluído", description: translateAuthError(signInError.message), variant: "destructive" });
          return;
        }

        activeSession = signInData.session;
      }

      const { error: regError } = await supabase.rpc("complete_registration", {
        p_user_id: authData.user.id,
        p_name: data.name,
        p_phone: data.phone || null,
        p_company: data.company || null,
        p_role: data.role || null,
        p_city: data.city || null,
        p_avatar_id: selected.slug,
        p_avatar_emoji: selected.emoji,
        p_registration_type: isComplete ? "complete" : "quick",
        p_accepted_terms: Boolean(data.acceptedTerms),
        p_accepted_marketing: Boolean(data.acceptedMarketing),
      });

      if (regError) {
        console.error("[AvatarSelection] Erro ao completar cadastro", regError);
        toast({ title: "Erro ao salvar perfil", description: "Sua conta foi criada, mas não foi possível concluir o cadastro agora.", variant: "destructive" });
        return;
      }

      if (selected.is_easter_egg) {
        sessionStorage.setItem("easter_egg_unlocked", "true");
      }

      sessionStorage.setItem("onboarding_avatar", JSON.stringify(selected));

      sessionStorage.removeItem("registration_data");
      clearPendingRegistrationPassword();
      await refreshProfile();
      navigate("/onboarding-complete", { replace: true });
    } catch (error) {
      console.error("[AvatarSelection] Falha inesperada ao finalizar cadastro", error);
      toast({ title: "Erro inesperado", description: "Não foi possível concluir seu cadastro. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const step = 3;
  const totalSteps = 3;
  const progressPercent = Math.round((step / totalSteps) * 100);

  if (loadingAvatars) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando avatares...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
        <ChevronLeft size={24} />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">Escolha seu Avatar</h1>
      <p className="text-primary text-sm font-medium mb-2">Quem será seu companheiro de jornada?</p>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">Etapa {step} de {totalSteps}</span>
        <span className="text-xs font-bold text-primary">{progressPercent}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-secondary mb-6">
        <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3 mb-6">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-sm font-semibold text-primary">Escolha seu companheiro de jornada</p>
          <p className="text-xs text-muted-foreground">Cada avatar tem uma personalidade única</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
        {avatars.map((avatar, i) => (
          <motion.button
            key={avatar.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(avatar)}
            className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
              selected?.id === avatar.id
                ? "bg-primary/10 ring-2 ring-primary shadow-card"
                : "bg-card shadow-card hover:bg-secondary"
            }`}
          >
            {selected?.id === avatar.id && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-primary-foreground" />
              </div>
            )}
            {avatar.image_url ? (
              <img src={avatar.image_url} alt={avatar.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-2xl`}>
                {avatar.emoji}
              </div>
            )}
            <span className="text-xs font-medium text-foreground">{avatar.name}</span>
          </motion.button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card shadow-card flex items-center gap-3 mt-4"
        >
          {selected.image_url ? (
            <img src={selected.image_url} alt={selected.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center text-lg`}>
              {selected.emoji}
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground text-sm">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.description || "Seu companheiro está pronto para embarcar!"}</p>
          </div>
        </motion.div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selected || loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg mt-4 flex items-center justify-center gap-2 ${
          selected && !loading
            ? "gradient-cta text-primary-foreground shadow-button"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {loading ? "Criando conta..." : "🎮 Confirmar e Embarcar!"}
      </button>
    </div>
  );
};

export default AvatarSelection;
