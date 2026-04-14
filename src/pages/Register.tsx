import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, User, Mail, Lock, Phone, Building, Briefcase, MapPin, Eye, EyeOff, Shield, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setPendingRegistrationPassword } from "@/lib/registration";
import { formatPhone, isValidPhone } from "@/lib/phoneMask";

const Register = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const isComplete = type === "complete";

  const [bonusPoints, setBonusPoints] = useState<number | null>(null);

  useEffect(() => {
    sessionStorage.removeItem("registration_password");
  }, []);

  useEffect(() => {
    if (isComplete) {
      const load = async () => {
        const { data } = await supabase
          .from("missions")
          .select("slug, points")
          .in("slug", ["cadastro-simples", "cadastro-completo"]);
        if (data) {
          const simples = data.find((m) => m.slug === "cadastro-simples")?.points ?? 100;
          const completo = data.find((m) => m.slug === "cadastro-completo")?.points ?? 250;
          setBonusPoints(completo - simples);
        }
      };
      load();
    }
  }, [isComplete]);

  // Restore form data from sessionStorage
  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem("registration_data");
    if (saved) {
      const data = JSON.parse(saved);
      return {
        name: data.name || "",
        email: data.email || "",
        password: "",
        confirmPassword: "",
        phone: data.phone || "",
        company: data.company || "",
        role: data.role || "",
        city: data.city || "",
      };
    }
    return { name: "", email: "", password: "", confirmPassword: "", phone: "", company: "", role: "", city: "" };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(() => {
    const saved = sessionStorage.getItem("registration_data");
    return saved ? JSON.parse(saved).acceptedTerms === true : false;
  });
  const [acceptedMarketing, setAcceptedMarketing] = useState(() => {
    const saved = sessionStorage.getItem("registration_data");
    return saved ? JSON.parse(saved).acceptedMarketing === true : false;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Save form data to sessionStorage on every change
  // Save form data to sessionStorage on every change (excluding password fields)
  useEffect(() => {
    const { password, confirmPassword, ...safeFields } = form;
    const data = { ...safeFields, type: isComplete ? "complete" : "quick", acceptedTerms, acceptedMarketing };
    sessionStorage.setItem("registration_data", JSON.stringify(data));
  }, [form, acceptedTerms, acceptedMarketing, isComplete]);

  const update = (key: string, value: string) => {
    if (key === "phone") {
      setForm((p) => ({ ...p, phone: formatPhone(value) }));
      setErrors((p) => ({ ...p, phone: "" }));
      return;
    }
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const sanitizeField = (value: string, allowSlash = false) => {
    const pattern = allowSlash
      ? /[^a-zA-ZÀ-ÿ\s/]/g
      : /[^a-zA-ZÀ-ÿ\s]/g;
    return !pattern.test(value.trim());
  };

  const FIELD_INVALID_MSG = "Não é permitido usar caracteres especiais como @, $, %, <, >, etc.";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    else if (!sanitizeField(form.name)) e.name = FIELD_INVALID_MSG;
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    if (form.password.length < 6 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      e.password = "A senha deve ter no mínimo 6 caracteres, com letras e números.";
    }
    if (!form.confirmPassword.trim()) {
      e.confirmPassword = "Confirmação de senha obrigatória";
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = "Senhas não conferem";
    }
    if (!acceptedTerms) e.terms = "Aceite obrigatório";
    if (isComplete) {
      if (!form.phone.trim()) e.phone = "Telefone obrigatório";
      else if (!isValidPhone(form.phone)) e.phone = "Telefone inválido. Informe DDD + número.";
      if (!form.company.trim()) e.company = "Empresa obrigatória";
      else if (!sanitizeField(form.company)) e.company = FIELD_INVALID_MSG;
      if (!form.role.trim()) e.role = "Cargo obrigatório";
      else if (!sanitizeField(form.role)) e.role = FIELD_INVALID_MSG;
      if (!form.city.trim()) e.city = "Cidade/UF obrigatória";
      else if (!sanitizeField(form.city, true)) e.city = FIELD_INVALID_MSG;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setPendingRegistrationPassword(form.password);
    const { password, confirmPassword, ...safeFields } = form;
    const registrationData = { ...safeFields, type: isComplete ? "complete" : "quick", acceptedTerms, acceptedMarketing };
    sessionStorage.setItem("registration_data", JSON.stringify(registrationData));
    navigate("/avatar");
  };

  const basicFields = [
    { key: "name", label: "Nome Completo", icon: User, placeholder: "Seu nome", required: true },
    { key: "email", label: "E-mail", icon: Mail, placeholder: "seu@email.com", type: "email", required: true },
    { key: "password", label: "Senha", icon: Lock, placeholder: "Mínimo 6 caracteres", type: "password", required: true },
    { key: "confirmPassword", label: "Confirmar Senha", icon: Lock, placeholder: "Repita a senha", type: "password", required: true },
  ];

  const completeFields = [
    { key: "phone", label: "DDD+Telefone", icon: Phone, placeholder: "(11) 99999-9999", required: true },
    { key: "company", label: "Empresa", icon: Building, placeholder: "Nome da sua empresa", required: true },
    { key: "role", label: "Cargo", icon: Briefcase, placeholder: "Ex: Gerente de TI", required: true },
    { key: "city", label: "Cidade/UF", icon: MapPin, placeholder: "São Paulo/SP", required: true },
  ];

  const renderField = (field: typeof basicFields[0], i: number) => (
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
      {field.key === "password" && !errors[field.key] && (
        <p className="text-muted-foreground text-xs mt-1">A senha deve ter no mínimo 6 caracteres, com letras e números.</p>
      )}
      {errors[field.key] && (
        <p className="text-destructive text-xs mt-1">{errors[field.key]}</p>
      )}
    </motion.div>
  );

  // Progress bar segments
  const step = 2;
  const totalSteps = 3;

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
        <ChevronLeft size={24} />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isComplete ? "Cadastro Completo" : "Cadastro Rápido"}
      </h1>
      <p className="text-primary text-sm font-medium mb-2">
        Informações essenciais
      </p>

      {/* Progress bar */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <div className="flex-1 space-y-5 overflow-auto pb-4">
        {/* Box 1: Dados básicos */}
        <div className="p-4 rounded-2xl bg-card shadow-card space-y-4">
          {basicFields.map((field, i) => renderField(field, i))}
        </div>

        {/* Box 2: Dados completos (only for complete registration) */}
        {isComplete && (
          <div className="p-4 rounded-2xl bg-card shadow-card space-y-4">
            {/* Bonus banner */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                <Star size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700"><p className="text-sm font-bold text-emerald-700"><p className="text-sm font-bold text-emerald-700">+350 pontos bônus</p></p></p>
                <p className="text-xs text-muted-foreground">ao completar todos os campos</p>
              </div>
            </div>

            {completeFields.map((field, i) => renderField(field, i + basicFields.length))}
          </div>
        )}

        {/* Box 3: Termos e condições */}
        <div className="p-4 rounded-2xl bg-card shadow-card space-y-3">
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
