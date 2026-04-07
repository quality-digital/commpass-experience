import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const RegisterType = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-6">
        <ChevronLeft size={24} />
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Tipo de Cadastro</h1>
        <p className="text-primary text-sm font-medium mb-6">Escolha como quer participar</p>

        <div className="w-full h-1.5 rounded-full bg-secondary mb-8">
          <div className="w-1/4 h-full rounded-full gradient-primary" />
        </div>
      </motion.div>

      <div className="space-y-4 flex-1">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/register/quick")}
          className="w-full p-5 rounded-2xl bg-card shadow-card text-left"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl">🚀</div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">+100 pts</span>
          </div>
          <h3 className="font-bold text-foreground text-lg mb-1">Cadastro Rápido</h3>
          <p className="text-muted-foreground text-sm mb-3">Nome, e-mail e senha. Entre rápido na jornada!</p>
          <div className="flex gap-2">
            {["Nome", "E-mail"].map((f) => (
              <span key={f} className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-xs">{f}</span>
            ))}
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/register/complete")}
          className="w-full p-5 rounded-2xl bg-card shadow-card text-left"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">👑</div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">+350 pts</span>
          </div>
          <h3 className="font-bold text-foreground text-lg mb-1">Cadastro Completo</h3>
          <p className="text-muted-foreground text-sm mb-3">Dados completos para o máximo de pontos e melhor experiência.</p>
          <div className="flex flex-wrap gap-2">
            {["Nome", "E-mail", "Telefone", "Empresa", "Cargo", "Cidade"].map((f) => (
              <span key={f} className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-xs">{f}</span>
            ))}
          </div>
        </motion.button>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate("/register/quick")}
        className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6"
      >
        Continuar →
      </motion.button>
    </div>
  );
};

export default RegisterType;
