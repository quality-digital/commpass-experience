import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Shield, ShieldOff, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [showResetAll, setShowResetAll] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const resetUser = async (userId: string) => {
    setLoading(true);
    const { error } = await supabase.rpc("admin_reset_user", { target_user_id: userId });
    setLoading(false);
    setResetTarget(null);
    if (error) {
      toast({ title: "Erro ao resetar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário resetado", description: "Pontos zerados e missões/quizzes removidos." });
      load();
    }
  };

  const resetAllUsers = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("admin_reset_all_users");
    setLoading(false);
    setShowResetAll(false);
    if (error) {
      toast({ title: "Erro ao resetar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Todos os usuários resetados", description: "Pontos e missões zerados para todos." });
      load();
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <button
          onClick={() => setShowResetAll(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90"
        >
          <RotateCcw size={14} />
          Resetar Todos
        </button>
      </div>

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
                <td className="p-3 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => setResetTarget(u)}
                    className="text-sm text-amber-600 hover:opacity-70"
                    title="Resetar pontos e missões"
                  >
                    <RotateCcw size={16} />
                  </button>
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

      {/* Reset single user dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Resetar usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai zerar os pontos, missões e quizzes concluídos de <strong>{resetTarget?.name}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTarget && resetUser(resetTarget.user_id)}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Resetando..." : "Confirmar Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset all users dialog */}
      <AlertDialog open={showResetAll} onOpenChange={setShowResetAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Resetar TODOS os usuários
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai zerar os pontos, missões e quizzes de <strong>todos os usuários</strong> do sistema. Esta ação é irreversível!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetAllUsers}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Resetando..." : "Resetar Todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsers;
