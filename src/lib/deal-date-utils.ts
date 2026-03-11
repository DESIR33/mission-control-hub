/**
 * Extract the effective billing date for a sponsorship deal.
 * Priority: End Date from notes > closed_at > created_at
 *
 * Notes contain serialized metadata like:
 *   End Date: June 15th, 2026
 */
export function parseDealEndDate(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/End Date:\s*(.+)/);
  if (!match) return null;
  try {
    // Strip ordinal suffixes (st, nd, rd, th) before parsing
    const cleaned = match[1].trim().replace(/(\d+)(st|nd|rd|th)/g, "$1");
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Get the date a deal should be attributed to for revenue bucketing.
 * Uses End Date from notes metadata, falling back to closed_at then created_at.
 */
export function getDealAttributionDate(deal: {
  notes?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
}): string | null {
  return parseDealEndDate(deal.notes) ?? deal.closed_at ?? deal.created_at ?? null;
}
