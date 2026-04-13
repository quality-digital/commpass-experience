/**
 * Sanitizes error messages from Supabase/Postgres to prevent
 * leaking internal database structure, table names, or constraints.
 */

const INTERNAL_PATTERNS = [
  /key \(.*?\)/i,
  /violates.*constraint/i,
  /not present in table/i,
  /duplicate key/i,
  /foreign key/i,
  /relation ".*?"/i,
  /column ".*?"/i,
  /schema ".*?"/i,
  /function ".*?"/i,
  /permission denied/i,
  /row-level security/i,
  /policy/i,
];

const GENERIC_MESSAGE = "Não foi possível processar a solicitação. Tente novamente.";

export function sanitizeSupabaseError(error: unknown): string {
  if (!error) return GENERIC_MESSAGE;

  const message = typeof error === "string"
    ? error
    : (error as any)?.message || (error as any)?.error_description || "";

  if (!message) return GENERIC_MESSAGE;

  // Check if message contains internal database details
  for (const pattern of INTERNAL_PATTERNS) {
    if (pattern.test(message)) {
      console.error("[Security] Suppressed internal error:", message);
      return GENERIC_MESSAGE;
    }
  }

  return message;
}
