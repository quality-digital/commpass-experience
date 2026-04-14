import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Target, Brain, Building2, Users, ArrowLeft, Settings, ClipboardCheck, FileText, Trophy, SmilePlus, Sparkles, Dices, Egg, Medal } from "lucide-react";

const links = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/missions", icon: Target, label: "Missões" },
  { to: "/admin/quizzes", icon: Brain, label: "Quizzes" },
  { to: "/admin/brands", icon: Building2, label: "Marcas" },
  { to: "/admin/users", icon: Users, label: "Usuários" },
  { to: "/admin/approvals", icon: ClipboardCheck, label: "Aprovações" },
  { to: "/admin/avatars", icon: SmilePlus, label: "Avatares" },
  { to: "/admin/prizes", icon: Trophy, label: "Prêmios" },
  { to: "/admin/onboarding", icon: Sparkles, label: "Onboarding" },
  { to: "/admin/roulette", icon: Dices, label: "Roleta" },
  { to: "/admin/easter-egg", icon: Egg, label: "Easter Egg - Presencial" },
  { to: "/admin/ranking", icon: Medal, label: "Ranking" },
  { to: "/admin/policies", icon: FileText, label: "Políticas & Termos" },
  { to: "/admin/settings", icon: Settings, label: "Configurações" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-card border-r border-border p-4 flex flex-col shrink-0">
        <div className="mb-6">
          <h2 className="font-bold text-foreground text-lg">Admin</h2>
          <p className="text-xs text-muted-foreground">Comm Pass</p>
        </div>
        <nav className="space-y-1 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <ArrowLeft size={16} />
          Voltar ao App
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
