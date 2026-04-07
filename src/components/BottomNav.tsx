import { NavLink, useLocation } from "react-router-dom";
import { Home, Award, Target, Trophy, UserCircle } from "lucide-react";

const tabs = [
  { path: "/home", icon: Home, label: "Início" },
  { path: "/brands", icon: Award, label: "Marcas" },
  { path: "/missions", icon: Target, label: "Missões" },
  { path: "/ranking", icon: Trophy, label: "Ranking" },
  { path: "/profile", icon: UserCircle, label: "Perfil" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
