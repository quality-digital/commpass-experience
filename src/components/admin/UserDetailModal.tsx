import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Trophy, Shield, CheckCircle, XCircle, Target, Hash } from "lucide-react";

type UserProfile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  city: string | null;
  points: number;
  registration_type: string;
  avatar_emoji: string | null;
  avatar_id: string | null;
  accepted_terms: boolean;
  accepted_marketing: boolean;
  created_at: string;
  updated_at: string;
  isAdmin?: boolean;
};

type MissionEntry = {
  id: string;
  mission_name: string;
  mission_points: number;
  status: string;
  completed_at: string;
};

type Props = {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const BoolBadge = ({ value }: { value: boolean }) => (
  <Badge variant={value ? "default" : "destructive"} className="text-xs">
    {value ? <><CheckCircle size={12} className="mr-1" /> Sim</> : <><XCircle size={12} className="mr-1" /> Não</>}
  </Badge>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-medium text-foreground text-right">{value}</span>
  </div>
);

export default function UserDetailModal({ user, open, onOpenChange }: Props) {
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [quizzes, setQuizzes] = useState<{ name: string; score: number; completed_at: string }[]>([]);
  const [ranking, setRanking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);

    const loadDetails = async () => {
      // Missions
      const { data: um } = await supabase
        .from("user_missions")
        .select("id, status, completed_at, mission_id")
        .eq("user_id", user.user_id);

      if (um && um.length > 0) {
        const missionIds = um.map((m) => m.mission_id);
        const { data: mData } = await supabase
          .from("missions")
          .select("id, name, points")
          .in("id", missionIds);

        // Get actual points from audit log (source of truth for real points awarded)
        const { data: auditData } = await supabase
          .from("points_audit_log")
          .select("mission_id, points_added")
          .eq("user_id", user.user_id);

        // Build audit map: mission_id -> points_added (use latest entry if multiple)
        const auditMap = new Map<string, number>();
        if (auditData) {
          for (const a of auditData) {
            if (a.mission_id) {
              auditMap.set(a.mission_id, a.points_added);
            }
          }
        }
        const mMap = new Map(mData?.map((m) => [m.id, m]) || []);
        setMissions(
          um.map((m) => ({
            id: m.id,
            mission_name: mMap.get(m.mission_id)?.name || "—",
            mission_points: auditMap.has(m.mission_id)
              ? auditMap.get(m.mission_id)!
              : mMap.get(m.mission_id)?.points ?? 0,
            status: m.status,
            completed_at: m.completed_at,
          }))
        );
      } else {
        setMissions([]);
      }

      // Quizzes
      const { data: uq } = await supabase
        .from("user_quizzes")
        .select("score, completed_at, quiz_id")
        .eq("user_id", user.user_id);

      if (uq && uq.length > 0) {
        const quizIds = uq.map((q) => q.quiz_id);
        const { data: qData } = await supabase
          .from("quizzes")
          .select("id, title")
          .in("id", quizIds);

        const qMap = new Map(qData?.map((q) => [q.id, q.title]) || []);
        setQuizzes(
          uq.map((q) => ({
            name: qMap.get(q.quiz_id) || "—",
            score: q.score,
            completed_at: q.completed_at,
          }))
        );
      } else {
        setQuizzes([]);
      }

      // Ranking
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("user_id, points")
        .order("points", { ascending: false });

      if (allProfiles) {
        const idx = allProfiles.findIndex((p) => p.user_id === user.user_id);
        setRanking(idx >= 0 ? idx + 1 : null);
      }

      setLoading(false);
    };

    loadDetails();
  }, [user, open]);

  if (!user) return null;

  const statusMap: Record<string, string> = {
    completed: "Concluída",
    approved: "Aprovada",
    pending_approval: "Pendente",
    rejected: "Rejeitada",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{user.avatar_emoji || "👤"}</span>
            <div>
              <div className="flex items-center gap-2">
                {user.name}
                {user.isAdmin && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield size={12} className="mr-1" /> Admin
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-normal">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {/* Dados Básicos */}
            <Section title="Dados Básicos">
              <Row label="Nome" value={user.name} />
              <Row label="E-mail" value={user.email} />
              <Row label="DDD+Telefone" value={user.phone || "—"} />
              <Row label="Empresa" value={user.company || "—"} />
              <Row label="Cargo" value={user.role || "—"} />
              <Row label="Cidade" value={user.city || "—"} />
              <Row label="Tipo de cadastro" value={<Badge variant="outline" className="capitalize">{user.registration_type}</Badge>} />
              <Row label="Data de cadastro" value={fmt(user.created_at)} />
              <Row label="Última atualização" value={fmt(user.updated_at)} />
            </Section>

            <Separator />

            {/* Perfil */}
            <Section title="Perfil & Ranking">
              <Row label="Avatar" value={<span className="text-xl">{user.avatar_emoji || "👤"}</span>} />
              <Row label="Pontuação atual" value={<span className="text-primary font-bold">{user.points.toLocaleString("pt-BR")} pts</span>} />
              <Row label="Posição no ranking" value={ranking ? `${ranking}º lugar` : "—"} />
            </Section>

            <Separator />

            {/* Consentimentos */}
            <Section title="Consentimentos">
              <Row label="Aceite de termos de uso" value={<BoolBadge value={user.accepted_terms} />} />
              <Row label="Data aceite termos" value={user.accepted_terms ? fmt(user.created_at) : "—"} />
              <Row label="Aceite de marketing" value={<BoolBadge value={user.accepted_marketing} />} />
              <Row label="Data aceite marketing" value={user.accepted_marketing ? fmt(user.created_at) : "—"} />
            </Section>

            <Separator />

            {/* Missões */}
            <Section title={`Missões (${missions.length})`}>
              {missions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma missão concluída.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2 font-medium text-muted-foreground">Missão</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Pontos</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missions.map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="p-2">{m.mission_name}</td>
                          <td className="p-2 text-center font-medium text-primary">{m.mission_points}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-xs">{statusMap[m.status] || m.status}</Badge>
                          </td>
                          <td className="p-2 text-right text-muted-foreground text-xs">{fmt(m.completed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Quizzes */}
            {quizzes.length > 0 && (
              <>
                <Separator />
                <Section title={`Quizzes (${quizzes.length})`}>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-medium text-muted-foreground">Quiz</th>
                          <th className="text-center p-2 font-medium text-muted-foreground">Pontos</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizzes.map((q, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2">{q.name}</td>
                            <td className="p-2 text-center font-medium text-primary">{q.score}</td>
                            <td className="p-2 text-right text-muted-foreground text-xs">{fmt(q.completed_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </>
            )}

            <Separator />

            {/* IDs */}
            <Section title="Informações Técnicas">
              <Row label="Profile ID" value={<code className="text-xs bg-muted px-2 py-0.5 rounded">{user.id}</code>} />
              <Row label="User ID (auth)" value={<code className="text-xs bg-muted px-2 py-0.5 rounded">{user.user_id}</code>} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
