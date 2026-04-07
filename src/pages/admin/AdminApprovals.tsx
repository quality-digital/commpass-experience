import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Check, X, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PendingMission = {
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

const AdminApprovals = () => {
  const [pending, setPending] = useState<PendingMission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Get all pending_approval missions with user and mission info
    const { data: pendingMissions } = await supabase
      .from("user_missions")
      .select("id, user_id, mission_id, status, photo_url, completed_at")
      .eq("status", "pending_approval")
      .order("completed_at", { ascending: false });

    if (!pendingMissions || pendingMissions.length === 0) {
      setPending([]);
      setLoading(false);
      return;
    }

    // Get unique user_ids and mission_ids
    const userIds = [...new Set(pendingMissions.map((p) => p.user_id))];
    const missionIds = [...new Set(pendingMissions.map((p) => p.mission_id))];

    const [{ data: profiles }, { data: missions }] = await Promise.all([
      supabase.from("profiles").select("user_id, name, email").in("user_id", userIds),
      supabase.from("missions").select("id, name, points").in("id", missionIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const missionMap = new Map((missions || []).map((m) => [m.id, m]));

    const enriched: PendingMission[] = pendingMissions.map((pm) => {
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

    setPending(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (item: PendingMission) => {
    // Update status to approved
    await supabase
      .from("user_missions")
      .update({ status: "approved" })
      .eq("id", item.id);

    // Add points to user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, points")
      .eq("user_id", item.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ points: profile.points + item.mission_points })
        .eq("id", profile.id);
    }

    toast({ title: "✅ Missão aprovada!", description: `+${item.mission_points} pontos para ${item.user_name}` });
    setPending((prev) => prev.filter((p) => p.id !== item.id));
  };

  const handleReject = async (item: PendingMission) => {
    await supabase
      .from("user_missions")
      .update({ status: "rejected" })
      .eq("id", item.id);

    toast({ title: "❌ Missão rejeitada", description: `Envio de ${item.user_name} foi rejeitado.` });
    setPending((prev) => prev.filter((p) => p.id !== item.id));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprovações</h1>
          <p className="text-sm text-muted-foreground">Aprove ou rejeite envios de missões dos participantes</p>
        </div>
        {pending.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
            {pending.length} pendente{pending.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : pending.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-bold text-foreground mb-1">Tudo aprovado!</p>
          <p className="text-sm text-muted-foreground">Nenhuma missão aguardando aprovação.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <div key={item.id} className="p-5 rounded-2xl bg-card shadow-card border border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-foreground">{item.user_name}</p>
                  <p className="text-xs text-muted-foreground">{item.user_email}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  +{item.mission_points} pts
                </span>
              </div>

              <p className="text-sm font-semibold text-foreground mb-1">📋 {item.mission_name}</p>
              <p className="text-xs text-muted-foreground mb-3">
                Enviado em {new Date(item.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>

              {item.photo_url && (
                <div className="mb-4">
                  <a href={item.photo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
                    <ExternalLink size={12} /> Ver foto em tamanho real
                  </a>
                  <img src={item.photo_url} alt="Envio do usuário" className="w-full max-h-64 object-cover rounded-xl border border-border" />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(item)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors"
                >
                  <X size={16} /> Rejeitar
                </button>
                <button
                  onClick={() => handleApprove(item)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  <Check size={16} /> Aprovar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminApprovals;
