import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Shield, ShieldOff, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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

  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("points", { ascending: false });
    if (!profiles) return;
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const adminIds = new Set(roles?.filter((r) => r.role === "admin").map((r) => r.user_id) || []);
    setUsers(profiles.map((p) => ({ ...p, isAdmin: adminIds.has(p.user_id) })));
    setSelectedIds(new Set());
  };

  useEffect(() => { load(); }, []);

  // Non-admin users for selection (can't delete admins from bulk)
  const selectableUsers = useMemo(() => users.filter((u) => !u.isAdmin), [users]);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.user_id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map((u) => u.user_id)));
    }
  };

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
      toast({ title: "Usuário resetado", description: "Pontos zerados e missões/quizzes removidos. Missões de cadastro preservadas." });
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
      toast({ title: "Todos os usuários resetados", description: "Pontos e missões zerados para todos. Missões de cadastro preservadas." });
      load();
    }
  };

  const executeDelete = async (userIds: string[]) => {
    setDeleting(true);
    setDeleteProgress({ current: 0, total: userIds.length });

    // Process in batches of 5 for progress feedback
    const batchSize = 5;
    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const { data, error } = await supabase.functions.invoke("delete-users", {
        body: { userIds: batch },
      });

      if (error) {
        failedCount += batch.length;
      } else if (data) {
        deletedCount += data.deleted || 0;
        failedCount += data.failed || 0;
      }

      setDeleteProgress({ current: Math.min(i + batchSize, userIds.length), total: userIds.length });
    }

    setDeleting(false);
    setDeleteTarget(null);
    setShowBulkDelete(false);
    setSelectedIds(new Set());

    if (failedCount === 0) {
      toast({ title: "Exclusão concluída", description: `${deletedCount} usuário(s) excluído(s) com sucesso.` });
    } else {
      toast({
        title: "Exclusão parcial",
        description: `${deletedCount} excluído(s), ${failedCount} com erro.`,
        variant: "destructive",
      });
    }

    load();
  };

  const selectedCount = selectedIds.size;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Trash2 size={14} />
              Excluir {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={() => setShowResetAll(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90"
          >
            <RotateCcw size={14} />
            Resetar Todos
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
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
              <tr
                key={u.id}
                className={`border-b border-border last:border-0 transition-colors ${
                  selectedIds.has(u.user_id) ? "bg-destructive/5" : ""
                }`}
              >
                <td className="p-3">
                  {!u.isAdmin ? (
                    <Checkbox
                      checked={selectedIds.has(u.user_id)}
                      onCheckedChange={() => toggleSelect(u.user_id)}
                      aria-label={`Selecionar ${u.name}`}
                    />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </td>
                <td className="p-3 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{u.avatar_emoji || "👤"}</span> {u.name}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3 text-primary font-bold">{u.points}</td>
                <td className="p-3 text-muted-foreground capitalize">{u.registration_type}</td>
                <td className="p-3">
                  {u.isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Admin</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    {!u.isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="text-sm text-destructive hover:opacity-70"
                        title="Excluir usuário"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete single user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 size={18} className="text-destructive" />
              Excluir usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              <br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span> Todos os dados do usuário serão removidos permanentemente (perfil, pontos, missões, quizzes e ranking).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && (
            <div className="px-1">
              <Progress value={100} className="h-2 animate-pulse" />
              <p className="text-xs text-muted-foreground mt-1">Excluindo...</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && executeDelete([deleteTarget.user_id])}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Confirmar exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={(open) => !deleting && setShowBulkDelete(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Excluir {selectedCount} usuário{selectedCount > 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedCount} usuário{selectedCount > 1 ? "s" : ""}</strong>?
              <br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span> Todos os dados dos usuários selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && (
            <div className="px-1">
              <Progress value={(deleteProgress.current / deleteProgress.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Excluindo {deleteProgress.current} de {deleteProgress.total} usuários...
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeDelete(Array.from(selectedIds))}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : `Confirmar exclusão (${selectedCount})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset single user dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Resetar usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai zerar os pontos, missões e quizzes concluídos de <strong>{resetTarget?.name}</strong>. As missões de cadastro (Simples e Completo) serão preservadas. Esta ação não pode ser desfeita.
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
              Isso vai zerar os pontos, missões e quizzes de <strong>todos os usuários</strong> do sistema. As missões de cadastro serão preservadas. Esta ação é irreversível!
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
