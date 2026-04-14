import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, CheckCircle, ShieldCheck, Phone, TrainFront } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ResetStep = "email" | "confirm" | "newPassword" | "success";

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  const masked = "*".repeat(Math.max(local.length - 2, 1));
  return `${visible}${masked}@${domain}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset flow state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha para continuar");
      return;
    }

    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (authError) {
      console.error("[Login] Erro ao autenticar", authError);
      const normalizedMessage = authError.message.toLowerCase();
      if (normalizedMessage.includes("email not confirmed")) {
        setError("Seu e-mail ainda não foi confirmado.");
      } else if (normalizedMessage.includes("invalid login credentials")) {
        setError("E-mail ou senha incorretos");
      } else {
        setError("Não foi possível entrar agora. Tente novamente.");
      }
    } else {
      navigate("/home", { replace: true });
    }

    setLoading(false);
  };

  const handleStartReset = () => {
    setForgotMode(true);
    setResetStep("email");
    setResetEmail("");
    setConfirmEmail("");
    setConfirmPhone("");
    setMaskedPhone("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
  };

  const handleEmailSubmit = async () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      setError("Digite um e-mail válido");
      return;
    }
    setError("");
    setLoadingHint(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-reset-hint", {
        body: { email: resetEmail.toLowerCase().trim() },
      });

      if (fnError || !data?.maskedPhone) {
        setError("Não foi possível processar a solicitação. Tente novamente.");
        setLoadingHint(false);
        return;
      }

      setMaskedPhone(data.maskedPhone);
      setResetStep("confirm");
    } catch {
      setError("Não foi possível processar a solicitação. Tente novamente.");
    }
    setLoadingHint(false);
  };

  const handleConfirmIdentity = () => {
    if (confirmEmail.toLowerCase().trim() !== resetEmail.toLowerCase().trim()) {
      setError("Dados inválidos. Verifique e tente novamente.");
      setConfirmEmail("");
      setConfirmPhone("");
      return;
    }
    const phoneDigits = confirmPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Dados inválidos. Verifique e tente novamente.");
      return;
    }
    setError("");
    setResetStep("newPassword");
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("A senha deve conter letras e números");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setResetting(true);
    setError("");

    const { data, error: fnError } = await supabase.functions.invoke("reset-password-no-email", {
      body: { email: resetEmail.toLowerCase().trim(), phone: confirmPhone.replace(/\D/g, ""), newPassword },
    });

    if (fnError || (data && data.error)) {
      setError(data?.error || "Não foi possível processar a solicitação. Tente novamente.");
    } else {
      setResetStep("success");
      toast.success("Senha redefinida com sucesso!");
    }
    setResetting(false);
  };

  const handleBackFromReset = () => {
    if (resetStep === "confirm") {
      setResetStep("email");
      setConfirmEmail("");
    } else if (resetStep === "newPassword") {
      setResetStep("confirm");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      setForgotMode(false);
      setResetStep("email");
    }
    setError("");
  };

  // SUCCESS SCREEN
  if (forgotMode && resetStep === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle size={40} className="text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground">Senha redefinida!</h1>
        <p className="text-muted-foreground text-sm">Agora você pode fazer login com sua nova senha.</p>
        <button
          onClick={() => {
            setForgotMode(false);
            setResetStep("email");
            setEmail(resetEmail);
            setPassword("");
          }}
          className="mt-4 px-6 py-3 rounded-2xl gradient-cta text-primary-foreground font-bold shadow-button"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  // FORGOT PASSWORD FLOW
  if (forgotMode) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
        <button onClick={handleBackFromReset} className="text-muted-foreground mb-6">
          <ChevronLeft size={24} />
        </button>

        <AnimatePresence mode="wait">
          {resetStep === "email" && (
            <motion.div key="email-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-foreground mb-1">Recuperar Senha</h1>
              <p className="text-primary text-sm font-medium mb-8">Digite o e-mail da sua conta</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">E-mail</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Mail size={18} className="text-muted-foreground" />
                    </div>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
                      className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
              </div>

              <button
                onClick={handleEmailSubmit}
                disabled={loadingHint}
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6 disabled:opacity-50"
              >
                {loadingHint ? "Verificando..." : "Continuar"}
              </button>
            </motion.div>
          )}

          {resetStep === "confirm" && (
            <motion.div key="confirm-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck size={24} className="text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Confirme sua identidade</h1>
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                Para sua segurança, confirme os dados da sua conta.
              </p>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 mb-2 space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">E-mail da conta:</p>
                  <p className="text-foreground font-mono font-semibold text-base tracking-wide">{maskEmail(resetEmail)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone da conta:</p>
                  <p className="text-foreground font-mono font-semibold text-base tracking-wide">{maskedPhone}</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Digite o e-mail completo</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Mail size={18} className="text-muted-foreground" />
                    </div>
                    <input
                      type="email"
                      placeholder="Confirme o e-mail completo"
                      value={confirmEmail}
                      onChange={(e) => { setConfirmEmail(e.target.value); setError(""); }}
                      className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Digite o telefone completo</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Phone size={18} className="text-muted-foreground" />
                    </div>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={confirmPhone}
                      onChange={(e) => { setConfirmPhone(formatPhone(e.target.value)); setError(""); }}
                      className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>

                {error && <p className="text-destructive text-sm text-center">{error}</p>}
              </div>

              <button
                onClick={handleConfirmIdentity}
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6"
              >
                Confirmar
              </button>
            </motion.div>
          )}

          {resetStep === "newPassword" && (
            <motion.div key="password-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-foreground mb-1">Nova Senha</h1>
              <p className="text-primary text-sm font-medium mb-8">Escolha uma nova senha para sua conta</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Nova senha</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Lock size={18} className="text-muted-foreground" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres (letras e números)"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      className="w-full pl-14 pr-10 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirmar senha</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Lock size={18} className="text-muted-foreground" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => { setConfirmNewPassword(e.target.value); setError(""); }}
                      className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>

                {error && <p className="text-destructive text-sm text-center">{error}</p>}
              </div>

              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6 disabled:opacity-50"
              >
                {resetting ? "Salvando..." : "Redefinir Senha"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // NORMAL LOGIN
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background relative">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="absolute top-8 left-6 text-muted-foreground">
        <ChevronLeft size={24} />
      </button>

      {/* Header icon + text */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
        <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary to-[hsl(210,90%,55%)] flex items-center justify-center shadow-lg mb-4">
          <TrainFront size={36} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Entrar na Jornada</h1>
        <p className="text-primary text-sm font-medium mt-1">Missão Vtex Day · Station Commerce</p>
      </motion.div>

      {/* Card with fields */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full bg-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border/50 mb-6"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">E-mail</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Mail size={18} className="text-primary" />
              </div>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Senha</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Lock size={18} className="text-primary" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full pl-14 pr-10 py-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartReset}
              className="text-primary text-sm font-medium hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {error && <p className="text-destructive text-sm text-center mt-3">{error}</p>}
      </motion.div>

      {/* Login button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <TrainFront size={20} />
        {loading ? "Entrando..." : "Entrar"}
      </motion.button>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Register button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate("/register-type")}
        className="w-full py-4 rounded-2xl border-2 border-primary text-primary font-bold text-base hover:bg-primary/5 transition-colors"
      >
        Não tem conta? Crie seu cadastro
      </motion.button>
    </div>
  );
};

export default Login;
