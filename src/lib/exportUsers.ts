import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

type ExportRow = {
  Nome: string;
  "E-mail": string;
  "Data de cadastro": string;
  "Última atualização": string;
  "Pontuação total": number;
  Avatar: string;
  "Aceite de termos": string;
  "Data aceite termos": string;
  "Aceite de marketing": string;
  "Data aceite marketing": string;
  "Missões concluídas": number;
  Telefone: string;
  Empresa: string;
  Cargo: string;
  Cidade: string;
  "Tipo de cadastro": string;
};

async function fetchExportData(): Promise<ExportRow[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("points", { ascending: false });

  if (!profiles) return [];

  // Count missions per user
  const { data: missionCounts } = await supabase
    .from("user_missions")
    .select("user_id");

  const countMap = new Map<string, number>();
  missionCounts?.forEach((m) => {
    countMap.set(m.user_id, (countMap.get(m.user_id) || 0) + 1);
  });

  return profiles.map((p) => ({
    Nome: p.name,
    "E-mail": p.email,
    "Data de cadastro": fmt(p.created_at),
    "Última atualização": fmt(p.updated_at),
    "Pontuação total": p.points,
    Avatar: p.avatar_emoji || "—",
    "Aceite de termos": p.accepted_terms ? "Sim" : "Não",
    "Data aceite termos": p.accepted_terms ? fmt(p.created_at) : "—",
    "Aceite de marketing": p.accepted_marketing ? "Sim" : "Não",
    "Data aceite marketing": p.accepted_marketing ? fmt(p.created_at) : "—",
    "Missões concluídas": countMap.get(p.user_id) || 0,
    Telefone: p.phone || "—",
    Empresa: p.company || "—",
    Cargo: p.role || "—",
    Cidade: p.city || "—",
    "Tipo de cadastro": p.registration_type,
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportUsersCSV() {
  const rows = await fetchExportData();
  if (rows.length === 0) throw new Error("Nenhum usuário encontrado");

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `usuarios_${date}.csv`);
  return rows.length;
}

export async function exportUsersXLSX() {
  const rows = await fetchExportData();
  if (rows.length === 0) throw new Error("Nenhum usuário encontrado");

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-size columns
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)).valueOf() + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Usuários");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `usuarios_${date}.xlsx`);
  return rows.length;
}
