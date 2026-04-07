import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Users, Target, Brain, Building2 } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, missions: 0, quizzes: 0, brands: 0 });

  useEffect(() => {
    const load = async () => {
      const [u, m, q, b] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("missions").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        users: u.count || 0,
        missions: m.count || 0,
        quizzes: q.count || 0,
        brands: b.count || 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Usuários", value: stats.users, icon: Users, color: "from-blue-400 to-blue-500" },
    { label: "Missões", value: stats.missions, icon: Target, color: "from-cyan-400 to-teal-500" },
    { label: "Quizzes", value: stats.quizzes, icon: Brain, color: "from-pink-400 to-rose-500" },
    { label: "Marcas", value: stats.brands, icon: Building2, color: "from-amber-400 to-orange-500" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="p-5 rounded-2xl bg-card shadow-card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={20} className="text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
