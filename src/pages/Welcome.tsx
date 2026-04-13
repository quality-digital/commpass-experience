import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-between px-6 py-6 bg-background overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="inline-block px-4 py-1.5 rounded-full border border-primary/30 text-primary text-sm font-semibold tracking-wider">
          VTEX DAY 2026
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center text-center flex-1 justify-center"
      >
        <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl shadow-card bg-card">
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/quality-1775526968143.png" alt="Quality Digital" className="h-8 object-contain" />
          <div className="w-px h-10 bg-border" />
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/jitterbit-logo-1775527538784.png" alt="Jitterbit" className="h-8 object-contain" />
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-3">
          Comm Pass – Experience
        </h1>
        <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">
          Missão VTEX – Embarque nessa jornada
        </p>
        <p className="text-muted-foreground text-sm max-w-xs">
          Acumule pontos, complete missões e concorra a prêmios exclusivos
        </p>

        <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
          {["Cadastro", "Missões", "Quiz", "Prêmios"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-1"
      >
        <button
          onClick={() => navigate("/register-type")}
          className="w-full py-3.5 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button flex items-center justify-center gap-2"
        >
          🚀 Embarcar agora
        </button>
        <button
          onClick={() => navigate("/login")}
          className="w-full py-2 text-primary font-semibold text-sm flex items-center justify-center gap-2"
        >
          →  Já tenho conta
        </button>
      </motion.div>
    </div>
  );
};

export default Welcome;
