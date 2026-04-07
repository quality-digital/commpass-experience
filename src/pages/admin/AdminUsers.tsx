import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type UserProfile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  points: number;
  registration_type: string;
  avatar_emoji: string | null;
  created_at: string;
  isAdmin?: boolean;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("points", { ascending: false });
    if (!profiles) return;

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const adminIds = new Set(roles?.filter((r) => r.role === "admin").map((r) => r.user_id) || []);

    setUsers(profiles.map((p) => ({ ...p, isAdmin: adminIds.has(p.user_id) })));
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast({ title: "Admin removido" });
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast({ title: "Admin adicionado" });
    }
    load();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Usuários</h1>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Usuário</th>
              <th className="text-left p-3 text-muted-foreground font-medium">E-mail</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Pontos</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Cadastro</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Role</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground flex items-center gap-2">
                  <span className="text-lg">{u.avatar_emoji || "👤"}</span> {u.name}
                </td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3 text-primary font-bold">{u.points}</td>
                <td className="p-3 text-muted-foreground capitalize">{u.registration_type}</td>
                <td className="p-3">
                  {u.isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Admin</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => toggleAdmin(u.user_id, !!u.isAdmin)}
                    className={`text-sm ${u.isAdmin ? "text-destructive" : "text-primary"} hover:opacity-70`}
                    title={u.isAdmin ? "Remover admin" : "Tornar admin"}
                  >
                    {u.isAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
