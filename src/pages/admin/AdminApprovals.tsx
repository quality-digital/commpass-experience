import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Check, X, RotateCcw, ExternalLink, History, ChevronDown, ChevronUp, Filter } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Submission = {
  id: string;
  user_id: string;
  mission_id: string;
  status: string;
  photo_url: string | null;
  completed_at: string;
  user_name: string;
  user_email: string;
  mission_name: string;
  mission_points: number;
};

type AuditEntry = {
  id: string;
  previous_status: string;
  new_status: string;
  admin_name: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_approval: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-100" },
  approved: { label: "Aprovado", color: "text-green-700", bg: "bg-green-100" },
  rejected: { label: "Rejeitado", color: "text-red-700", bg: "bg-red-100" },
  reverted: { label: "Revertido", color: "text-purple-700", bg: "bg-purple-100" },
};

const statusLabel = (s: string) => STATUS_CONFIG[s]?.label || s;

const AdminApprovals = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending_approval");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [auditMap, setAuditMap] = useState<Record<string, AuditEntry[]>>({});

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    item: Submission;
    newStatus: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);

    const query = supabase
      .from("user_missions")
      .select("id, user_id, mission_id, status, photo_url, completed_at")
      .order("completed_at", { ascending: false });

    if (filter !== "all") {
      query.eq("status", filter);
    } else {
      query.in("status", ["pending_approval", "approved", "rejected", "reverted"]);
    }

    const { data: missions_data } = await query;
    if (!missions_data || missions_data.length === 0) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(missions_data.map((p) => p.user_id))];
    const missionIds = [...new Set(missions_data.map((p) => p.mission_id))];

    const [{ data: profiles }, { data: missions }] = await Promise.all([
      supabase.from("profiles").select("user_id, name, email").in("user_id", userIds),
      supabase.from("missions").select("id, name, points").in("id", missionIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const missionMap = new Map((missions || []).map((m) => [m.id, m]));

    const enriched: Submission[] = missions_data.map((pm) => {
      const prof = profileMap.get(pm.user_id);
      const miss = missionMap.get(pm.mission_id);
      return {
        ...pm,
        user_name: prof?.name || "Desconhecido",
        user_email: prof?.email || "",
        mission_name: miss?.name || "Missão",
        mission_points: miss?.points || 0,
      };
    });

    setSubmissions(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const loadHistory = async (userMissionId: string) => {
    if (expandedHistory === userMissionId) {
      setExpandedHistory(null);
      return;
    }
    const { data } = await supabase
      .from("approval_audit_log")
      .select("id, previous_status, new_status, admin_name, notes, created_at")
      .eq("user_mission_id", userMissionId)
      .order("created_at", { ascending: false });
    setAuditMap((prev) => ({ ...prev, [userMissionId]: (data as AuditEntry[]) || [] }));
    setExpandedHistory(userMissionId);
  };

  const requestAction = (item: Submission, newStatus: string) => {
    // For approving pending items, no extra confirmation needed
    if (item.status === "pending_approval" && newStatus === "approved") {
      executeAction(item, newStatus, "");
      return;
    }
    // All rejections and status changes require confirmation dialog (with notes)
    setConfirmAction({ item, newStatus });
    setActionNotes("");
  };

  const executeAction = async (item: Submission, newStatus: string, notes: string) => {
    setActionLoading(true);
    const { error } = await supabase.rpc("change_mission_approval_status", {
      p_user_mission_id: item.id,
      p_new_status: newStatus,
      p_notes: notes || null,
    });
    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast({ title: "❌ Erro", description: error.message, variant: "destructive" });
      return;
    }

    const actionLabels: Record<string, string> = {
      approved: "✅ Missão aprovada!",
      rejected: "❌ Missão rejeitada",
      reverted: "↩️ Decisão revertida",
    };

    const pointMsg = newStatus === "approved"
      ? `+${item.mission_points} pontos para ${item.user_name}`
      : newStatus === "rejected" && item.status === "approved"
        ? `-${item.mission_points} pontos de ${item.user_name}`
        : `Envio de ${item.user_name} atualizado.`;

    toast({ title: actionLabels[newStatus] || "Atualizado", description: pointMsg });

    // Refresh
    load();
    if (expandedHistory === item.id) {
      setExpandedHistory(null);
      setTimeout(() => loadHistory(item.id), 300);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending_approval").length;

  const filters = [
    { value: "pending_approval", label: "Pendentes" },
    { value: "approved", label: "Aprovados" },
    { value: "rejected", label: "Rejeitados" },
    { value: "reverted", label: "Revertidos" },
    { value: "all", label: "Todos" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprovações</h1>
          <p className="text-sm text-muted-foreground">Gerencie envios de missões com histórico completo</p>
        </div>
        {pendingCount > 0 && filter !== "pending_approval" && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter size={12} className="inline mr-1" />
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-bold text-foreground mb-1">Nenhum envio encontrado</p>
          <p className="text-sm text-muted-foreground">Nenhuma submissão com o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((item) => {
            const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "text-muted-foreground", bg: "bg-muted" };
            const isExpanded = expandedHistory === item.id;
            const history = auditMap[item.id] || [];

            return (
              <div key={item.id} className="p-5 rounded-2xl bg-card shadow-card border border-border">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-foreground">{item.user_name}</p>
                    <p className="text-xs text-muted-foreground">{item.user_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                      {item.mission_points} pts
                    </span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-foreground mb-1">📋 {item.mission_name}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Enviado em{" "}
                  {new Date(item.completed_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {item.photo_url && (
                  <div className="mb-4">
                    <a href={item.photo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
                      <ExternalLink size={12} /> Ver foto em tamanho real
                    </a>
                    <img src={item.photo_url} alt="Envio do usuário" className="w-full max-h-64 object-cover rounded-xl border border-border" />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mb-3">
                  {item.status === "pending_approval" && (
                    <>
                      <button
                        onClick={() => requestAction(item, "rejected")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
                      >
                        <X size={16} /> Rejeitar
                      </button>
                      <button
                        onClick={() => requestAction(item, "approved")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} /> Aprovar
                      </button>
                    </>
                  )}
                  {item.status === "approved" && (
                    <button
                      onClick={() => requestAction(item, "rejected")}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
                    >
                      <RotateCcw size={16} /> Reverter → Rejeitado
                    </button>
                  )}
                  {item.status === "rejected" && (
                    <button
                      onClick={() => requestAction(item, "approved")}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                    >
                      <RotateCcw size={16} /> Reverter → Aprovado
                    </button>
                  )}
                  {item.status === "reverted" && (
                    <>
                      <button
                        onClick={() => requestAction(item, "rejected")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
                      >
                        <X size={16} /> Rejeitar
                      </button>
                      <button
                        onClick={() => requestAction(item, "approved")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} /> Aprovar
                      </button>
                    </>
                  )}
                </div>

                {/* History toggle */}
                <button
                  onClick={() => loadHistory(item.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History size={12} />
                  Histórico de ações
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma ação registrada ainda.</p>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className="flex items-start gap-2 text-xs">
                          <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                          <div>
                            <p className="text-foreground">
                              <Badge variant="outline" className="text-[10px] mr-1">{statusLabel(h.previous_status)}</Badge>
                              →
                              <Badge variant="outline" className="text-[10px] ml-1">{statusLabel(h.new_status)}</Badge>
                              <span className="text-muted-foreground ml-2">por {h.admin_name || "Admin"}</span>
                            </p>
                            {h.notes && <p className="text-muted-foreground italic mt-0.5">"{h.notes}"</p>}
                            <p className="text-muted-foreground mt-0.5">
                              {new Date(h.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.newStatus === "rejected" ? "Rejeitar missão" : "Alterar decisão"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.newStatus === "rejected" 
                ? "Informe o motivo da rejeição. O usuário verá essa justificativa no app."
                : "Tem certeza que deseja alterar esta decisão? Isso impactará a pontuação do usuário."
              }
              {confirmAction && confirmAction.item.status === "approved" && (
                <span className="block mt-2 font-semibold text-destructive">
                  ⚠️ {confirmAction.item.mission_points} pontos serão removidos de {confirmAction.item.user_name}.
                </span>
              )}
              {confirmAction && confirmAction.newStatus === "approved" && confirmAction.item.status !== "approved" && (
                <span className="block mt-2 font-semibold text-green-600">
                  ✅ {confirmAction.item.mission_points} pontos serão creditados a {confirmAction.item.user_name}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder={confirmAction?.newStatus === "rejected" ? "Motivo da rejeição (obrigatório)" : "Motivo da alteração (opcional)"}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || (confirmAction?.newStatus === "rejected" && !actionNotes.trim())}
              onClick={() => {
                if (confirmAction) {
                  executeAction(confirmAction.item, confirmAction.newStatus, actionNotes);
                }
              }}
            >
              {actionLoading ? "Processando..." : confirmAction?.newStatus === "rejected" ? "Confirmar rejeição" : "Confirmar alteração"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminApprovals;
