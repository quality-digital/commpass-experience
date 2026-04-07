import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, User, Mail, Lock, Phone, Building, Briefcase, MapPin, Eye, EyeOff, Shield } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const isComplete = type === "complete";

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", company: "", role: "", city: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não conferem";
    if (!acceptedTerms) e.terms = "Aceite obrigatório";
    if (isComplete) {
      if (!form.phone.trim()) e.phone = "Telefone obrigatório";
      if (!form.company.trim()) e.company = "Empresa obrigatória";
      if (!form.role.trim()) e.role = "Cargo obrigatório";
      if (!form.city.trim()) e.city = "Cidade obrigatória";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const registrationData = { ...form, type: isComplete ? "complete" : "quick", acceptedTerms, acceptedMarketing };
    sessionStorage.setItem("registration_data", JSON.stringify(registrationData));
    navigate("/avatar");
  };

  const fields = [
    { key: "name", label: "Nome Completo", icon: User, placeholder: "Seu nome", required: true },
    { key: "email", label: "E-mail", icon: Mail, placeholder: "seu@email.com", type: "email", required: true },
    { key: "password", label: "Senha", icon: Lock, placeholder: "Mínimo 6 caracteres", type: "password", required: true },
    { key: "confirmPassword", label: "Confirmar Senha", icon: Lock, placeholder: "Repita a senha", type: "password", required: true },
    ...(isComplete
      ? [
          { key: "phone", label: "Telefone", icon: Phone, placeholder: "(11) 99999-9999", required: true },
          { key: "company", label: "Empresa", icon: Building, placeholder: "Sua empresa", required: true },
          { key: "role", label: "Cargo", icon: Briefcase, placeholder: "Seu cargo", required: true },
          { key: "city", label: "Cidade", icon: MapPin, placeholder: "Sua cidade", required: true },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
        <ChevronLeft size={24} />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isComplete ? "Cadastro Completo" : "Cadastro Rápido"}
      </h1>
      <p className="text-primary text-sm font-medium mb-4">
        {isComplete ? "Informações completas" : "Informações essenciais"}
      </p>

      <div className="w-full h-1.5 rounded-full bg-secondary mb-6">
        <div className="w-2/4 h-full rounded-full gradient-primary" />
      </div>

      <div className="flex-1 space-y-4 overflow-auto pb-4">
        {fields.map((field, i) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <field.icon size={18} className="text-muted-foreground" />
              </div>
              <input
                type={
                  field.type === "password"
                    ? showPassword ? "text" : "password"
                    : field.type || "text"
                }
                placeholder={field.placeholder}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full pl-14 pr-10 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              {field.type === "password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
            {errors[field.key] && (
              <p className="text-destructive text-xs mt-1">{errors[field.key]}</p>
            )}
          </motion.div>
        ))}

        <div className="p-4 rounded-xl bg-secondary/50 space-y-3 mt-4">
          <div className="flex items-start gap-3 text-xs text-muted-foreground">
            <Shield size={18} className="text-primary shrink-0 mt-0.5" />
            <p>
              Ao se cadastrar, você concorda com nossa{" "}
              <Link to="/policies?tab=privacy" className="text-primary underline font-medium">Política de Privacidade</Link> e{" "}
              <Link to="/policies?tab=terms" className="text-primary underline font-medium">Termos de Uso</Link> em conformidade com a LGPD.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => { setAcceptedTerms(e.target.checked); setErrors((p) => ({ ...p, terms: "" })); }}
              className="w-5 h-5 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground font-medium">
              Aceito os termos e política de privacidade <span className="text-destructive">*</span>
            </span>
          </label>
          {errors.terms && <p className="text-destructive text-xs">{errors.terms}</p>}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedMarketing}
              onChange={(e) => setAcceptedMarketing(e.target.checked)}
              className="w-5 h-5 rounded border-border accent-primary"
            />
            <span className="text-xs text-muted-foreground">Aceito receber comunicações de marketing</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-4"
      >
        Continuar →
      </button>
    </div>
  );
};

export default Register;
