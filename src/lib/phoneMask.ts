/**
 * Formats a phone number string with Brazilian mask.
 * Celular: (11) 97427-8313
 * Fixo:    (11) 4412-5454
 */
export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular: (XX) XXXXX-XXXX
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/** Extracts only digits from a formatted phone string */
export const phoneDigits = (value: string): string => value.replace(/\D/g, "");

/** Validates phone: must have 10 (fixo) or 11 (celular) digits */
export const isValidPhone = (value: string): boolean => {
  const len = phoneDigits(value).length;
  return len === 10 || len === 11;
};
