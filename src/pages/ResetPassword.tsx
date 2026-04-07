import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setValidSession(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
      setChecking(false);
    });

    const timeout = setTimeout(() => setChecking(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Erro ao redefinir senha. Tente novamente.");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/home"), 2500);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Verificando...</p>
      </div>
    );
  }

  if (!validSession && !checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <p className="text-foreground font-semibold text-lg">Link inválido ou expirado</p>
        <p className="text-muted-foreground text-sm">Solicite um novo link de recuperação na tela de login.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-6 py-3 rounded-2xl gradient-cta text-primary-foreground font-bold shadow-button"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle size={40} className="text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground">Senha redefinida!</h1>
        <p className="text-muted-foreground text-sm">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Nova Senha</h1>
        <p className="text-primary text-sm font-medium mb-8">Escolha uma nova senha para sua conta</p>
      </motion.div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Nova senha</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Lock size={18} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
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

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirmar senha</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Lock size={18} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
      </div>

      <button
        onClick={handleReset}
        disabled={loading}
        className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6 disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Redefinir Senha"}
      </button>
    </div>
  );
};

export default ResetPassword;