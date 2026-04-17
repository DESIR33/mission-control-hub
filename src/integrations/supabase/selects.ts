/**
 * Shared Supabase `.select()` column fragments
 * ─────────────────────────────────────────────
 * Centralising column lists here (instead of inlining 50+ field strings inside
 * every hook) reduces Supabase egress, speeds up JSON parsing, and keeps list
 * vs detail payloads honest. Import a fragment, compose as needed.
 *
 * Rules:
 * - `*_LIST_FIELDS` — only columns the list/table UI actually reads. Keep tight.
 * - `*_DETAIL_FIELDS` — full record for profile/detail pages.
 * - `*_EMBED_FIELDS` — minimal columns when a row is embedded as a foreign
 *   relation in another query (e.g. `contacts(${CONTACT_EMBED_FIELDS})`).
 *
 * When adding a new consumer, extend the fragment rather than inlining a new
 * column list — one source of truth per table.
 */

// ── Contacts ────────────────────────────────────────────────────────────────

/** Minimal contact fields used when a contact is nested inside another row. */
export const CONTACT_EMBED_FIELDS = "id, first_name, last_name, email, role, status";

/** Just the id — used when only a count or existence check is needed. */
export const CONTACT_ID_ONLY = "id";

// ── Companies ───────────────────────────────────────────────────────────────

/** Minimal company fields used when a company is nested inside another row. */
export const COMPANY_EMBED_FIELDS = "id, name, logo_url, industry";

// ── Activities ──────────────────────────────────────────────────────────────

export const ACTIVITY_FIELDS =
  "id, workspace_id, entity_id, entity_type, activity_type, title, description, performed_at, performed_by, metadata, created_at";
