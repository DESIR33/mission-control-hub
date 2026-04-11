/**
 * Feature 9: Audit Log & Observability
 * Shared helper for recording audit entries with timing.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditEntry {
  workspace_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  actor_type?: string;
  actor_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit log entry with request timing.
 * Fire-and-forget: does not block the caller.
 */
export function recordAudit(
  supabase: SupabaseClient,
  entry: AuditEntry,
  durationMs?: number
): void {
  supabase
    .from("memory_audit_log")
    .insert({
      workspace_id: entry.workspace_id,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id || null,
      actor_type: entry.actor_type || "system",
      actor_id: entry.actor_id || null,
      request_duration_ms: durationMs || null,
      metadata: entry.metadata || {},
    })
    .then(() => {})
    .catch((e: Error) => console.error("Audit log error:", e.message));
}

/**
 * Wrap an async operation with timing and audit logging.
 */
export async function withAudit<T>(
  supabase: SupabaseClient,
  entry: AuditEntry,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    const duration = Math.round(performance.now() - start);
    recordAudit(supabase, entry, duration);
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    recordAudit(supabase, {
      ...entry,
      action: `${entry.action}.error`,
      metadata: {
        ...entry.metadata,
        error: (error as Error).message,
      },
    }, duration);
    throw error;
  }
}
