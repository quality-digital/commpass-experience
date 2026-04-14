import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number with Brazilian thousand separator (e.g. 1000 → 1.000) */
export function fmtPts(value: number): string {
  return value.toLocaleString("pt-BR");
}
