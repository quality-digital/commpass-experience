import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, CheckCircle, ShieldCheck } from "lucide-react";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-mail ou senha incorretos");
    } else {
      navigate("/home");
    }
    setLoading(false);
  };

  const handleStartReset = () => {
    setForgotMode(true);
    setResetStep("email");
    setResetEmail("");
    setConfirmEmail("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
  };

  const handleEmailSubmit = () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      setError("Digite um e-mail válido");
      return;
    }
    setError("");
    setResetStep("confirm");
  };

  const handleConfirmEmail = () => {
    if (confirmEmail.toLowerCase().trim() !== resetEmail.toLowerCase().trim()) {
      setError("O e-mail digitado não confere. Tente novamente.");
      setConfirmEmail("");
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
      body: { email: resetEmail.toLowerCase().trim(), newPassword },
    });

    if (fnError || (data && data.error)) {
      const msg = data?.error || "Erro ao redefinir senha. Tente novamente.";
      if (msg === "E-mail não encontrado") {
        setError("E-mail não encontrado. Verifique e tente novamente.");
      } else {
        setError(msg);
      }
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
                className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6"
              >
                Continuar
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
                Para sua segurança, confirme o e-mail completo da sua conta.
              </p>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 mb-8">
                <p className="text-sm text-muted-foreground">E-mail da conta:</p>
                <p className="text-foreground font-mono font-semibold text-base tracking-wide">{maskEmail(resetEmail)}</p>
              </div>

              <div className="space-y-4">
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
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
              </div>

              <button
                onClick={handleConfirmEmail}
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
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-6">
        <ChevronLeft size={24} />
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Entrar</h1>
        <p className="text-primary text-sm font-medium mb-8">Bem-vindo de volta!</p>
      </motion.div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">E-mail</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Mail size={18} className="text-muted-foreground" />
            </div>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Senha</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Lock size={18} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full pl-14 pr-10 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
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

        <button
          type="button"
          onClick={handleStartReset}
          className="text-primary text-sm font-medium hover:underline"
        >
          Esqueci minha senha
        </button>

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6 disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </div>
  );
};

export default Login;
