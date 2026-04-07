import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const OnboardingComplete = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  if (!user) { navigate("/"); return null; }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-primary font-semibold text-sm mb-2">Bem-vindo à jornada</p>
        <h1 className="text-3xl font-extrabold text-foreground mb-6">Cadastro Concluído!</h1>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${user.avatar?.color} flex items-center justify-center text-5xl shadow-card mb-4`}
      >
        {user.avatar?.emoji}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mb-8"
      >
        <h2 className="text-xl font-bold text-foreground mb-1">Você está a bordo!</h2>
        <p className="text-muted-foreground text-sm">
          Bem-vindo(a) ao VTEX Day, {user.name.split(" ")[0]}!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs p-6 rounded-2xl bg-card shadow-card text-center mb-8"
      >
        <p className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Pontos Iniciais</p>
        <p className="text-4xl font-extrabold text-primary mb-1">{user.points}</p>
        <p className="text-muted-foreground text-sm">pontos conquistados</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={() => navigate("/home")}
        className="w-full max-w-xs py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button flex items-center justify-center gap-2"
      >
        🚀 Iniciar Jornada
      </motion.button>
    </div>
  );
};

export default OnboardingComplete;
