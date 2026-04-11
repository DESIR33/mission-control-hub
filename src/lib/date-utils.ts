import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from "date-fns";

/**
 * Safe wrapper around date-fns `format` that never throws on invalid dates.
 * Returns the fallback string instead.
 */
export function safeFormat(
  dateInput: string | number | Date | null | undefined,
  formatStr: string,
  fallback: string = "--"
): string {
  if (dateInput == null || dateInput === "") return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return dateFnsFormat(d, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Safe wrapper around date-fns `formatDistanceToNow`.
 */
export function safeFormatDistanceToNow(
  dateInput: string | number | Date | null | undefined,
  options?: Parameters<typeof dateFnsFormatDistanceToNow>[1],
  fallback: string = "--"
): string {
  if (dateInput == null || dateInput === "") return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return dateFnsFormatDistanceToNow(d, options);
  } catch {
    return fallback;
  }
}

/**
 * Safely create a Date, returning null for invalid values.
 */
export function safeDate(dateInput: string | number | Date | null | undefined): Date | null {
  if (dateInput == null || dateInput === "") return null;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
