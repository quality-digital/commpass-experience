import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { RefreshCw, Trophy } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type RankedUser = {
  user_id: string;
  name: string;
  points: number;
  avatar_emoji: string | null;
  max_points_reached_at: string | null;
  last_points_at: string | null;
  updated_at: string;
};

const PAGE_SIZE = 15;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

const AdminRanking = () => {
  const [users, setUsers] = useState<RankedUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await supabase
        .from("profiles")
        .select("user_id, name, points, avatar_emoji, max_points_reached_at, last_points_at, updated_at", { count: "exact" })
        .order("points", { ascending: false })
        .order("last_points_at", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (data) setUsers(data as RankedUser[]);
      if (count !== null) setTotalCount(count);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Erro ao carregar ranking admin:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy size={24} className="text-primary" />
              Ranking
            </h1>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Última atualização: {formatDate(lastUpdated.toISOString())}
              </p>
            )}
          </div>
          <button
            onClick={loadRanking}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Atualizar ranking
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-16">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Pontuação</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Última pontuação</th>
                   <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Pontuação máxima em</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  users.map((user, i) => {
                    const position = (page - 1) * PAGE_SIZE + i + 1;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <tr
                        key={user.user_id}
                        className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-muted-foreground">
                          {position <= 3 ? medals[position - 1] : position}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{user.avatar_emoji || "👤"}</span>
                            <span className="font-medium text-foreground">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {user.points.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                           {formatDate(user.last_points_at)}
                         </td>
                        <td className="px-4 py-3 text-center">
                          {user.max_points_reached_at ? (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                              {formatDate(user.max_points_reached_at)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalCount} usuário{totalCount !== 1 ? "s" : ""} • Página {page} de {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage(page - 1)} className="cursor-pointer" />
                    </PaginationItem>
                  )}
                  {getPageNumbers().map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  {page < totalPages && (
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage(page + 1)} className="cursor-pointer" />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRanking;
