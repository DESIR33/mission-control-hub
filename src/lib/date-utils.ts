import { format } from "date-fns";

/**
 * Safely format a date string, returning a fallback if the value is
 * null, undefined, or produces an invalid Date.
 */
export function safeFormat(
  dateStr: string | null | undefined,
  formatStr: string,
  fallback: string = "--"
): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}
