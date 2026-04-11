/**
 * Feature 9: Memory Audit Query
 * Query audit logs with filters for observability and provenance tracking.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/api-key-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return json({ error: auth.error }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "query";

    if (action === "query") {
      // Query audit logs
      const body = req.method === "POST" ? await req.json() : {};
      const {
        action_filter,
        target_type,
        target_id,
        actor_type,
        actor_id,
        since,
        until,
        limit = 50,
        offset = 0,
      } = body;

      let q = supabase
        .from("memory_audit_log")
        .select("*")
        .eq("workspace_id", auth.workspaceId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 200))
        .range(offset, offset + Math.min(limit, 200) - 1);

      if (action_filter) q = q.eq("action", action_filter);
      if (target_type) q = q.eq("target_type", target_type);
      if (target_id) q = q.eq("target_id", target_id);
      if (actor_type) q = q.eq("actor_type", actor_type);
      if (actor_id) q = q.eq("actor_id", actor_id);
      if (since) q = q.gte("created_at", since);
      if (until) q = q.lte("created_at", until);

      const { data, error, count } = await q;

      if (error) {
        return json({ error: error.message }, 500);
      }

      return json({ entries: data || [], count: data?.length || 0 });
    }

    if (action === "provenance") {
      // Get full provenance chain for a specific memory
      const body = req.method === "POST" ? await req.json() : {};
      const { memory_id } = body;

      if (!memory_id) {
        return json({ error: "memory_id is required" }, 400);
      }

      // Get audit entries for this memory
      const { data: auditEntries } = await supabase
        .from("memory_audit_log")
        .select("*")
        .eq("workspace_id", auth.workspaceId)
        .eq("target_id", memory_id)
        .order("created_at", { ascending: true });

      // Get the memory itself
      const { data: memory } = await supabase
        .from("assistant_memory")
        .select("id, content, origin, source_type, agent_id, created_at, updated_at, entity_type, entity_id")
        .eq("id", memory_id)
        .eq("workspace_id", auth.workspaceId)
        .single();

      // Get relationships (how it connects to other memories)
      const { data: relationships } = await supabase
        .from("memory_relationships")
        .select("*")
        .eq("workspace_id", auth.workspaceId)
        .or(`memory_a_id.eq.${memory_id},memory_b_id.eq.${memory_id}`);

      // Get access log
      const { data: accessLog } = await supabase
        .from("memory_access_log")
        .select("accessed_by, accessed_at, query_context")
        .eq("memory_id", memory_id)
        .order("accessed_at", { ascending: false })
        .limit(20);

      return json({
        memory,
        provenance: {
          audit_trail: auditEntries || [],
          relationships: relationships || [],
          access_history: accessLog || [],
        },
      });
    }

    if (action === "stats") {
      // Get aggregated audit statistics
      const body = req.method === "POST" ? await req.json() : {};
      const { since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } = body;

      const { data: entries } = await supabase
        .from("memory_audit_log")
        .select("action, request_duration_ms, created_at")
        .eq("workspace_id", auth.workspaceId)
        .gte("created_at", since);

      if (!entries || entries.length === 0) {
        return json({ stats: { total_operations: 0, actions: {} } });
      }

      // Aggregate by action type
      const actionStats: Record<string, { count: number; avg_ms: number; p95_ms: number }> = {};
      const byAction: Record<string, number[]> = {};

      for (const entry of entries) {
        if (!byAction[entry.action]) byAction[entry.action] = [];
        if (entry.request_duration_ms) {
          byAction[entry.action].push(entry.request_duration_ms);
        }
      }

      for (const [action, durations] of Object.entries(byAction)) {
        const sorted = durations.sort((a, b) => a - b);
        actionStats[action] = {
          count: sorted.length,
          avg_ms: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
          p95_ms: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
        };
      }

      return json({
        stats: {
          total_operations: entries.length,
          period_since: since,
          actions: actionStats,
        },
      });
    }

    return json({ error: "Invalid action. Use ?action=query|provenance|stats" }, 400);
  } catch (error) {
    console.error("Audit query error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
