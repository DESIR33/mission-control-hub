import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  let decayedCount = 0;
  let expiredCount = 0;
  let unusedCount = 0;
  const errors: string[] = [];

  try {
    // ── 1. CONFIDENCE DECAY ──
    const { data: decayable } = await sb
      .from("assistant_memory")
      .select("id, confidence_score, decay_rate, created_at")
      .eq("workspace_id", WORKSPACE_ID)
      .eq("review_status", "approved")
      .gt("decay_rate", 0);

    for (const mem of decayable || []) {
      try {
        const daysElapsed = (Date.now() - new Date(mem.created_at).getTime()) / 86400000;
        const newConfidence = Math.max(0, mem.confidence_score * Math.pow(1 - mem.decay_rate, daysElapsed));
        const update: Record<string, unknown> = {
          confidence_score: Math.round(newConfidence * 1000) / 1000,
          updated_at: new Date().toISOString(),
        };
        if (newConfidence < 0.4) {
          update.review_status = "stale";
        }
        await sb.from("assistant_memory").update(update as any).eq("id", mem.id);
        decayedCount++;
      } catch (e) {
        errors.push(`decay ${mem.id}: ${e.message}`);
      }
    }

    // ── 2. VALIDITY EXPIRY ──
    const { data: expired } = await sb
      .from("assistant_memory")
      .select("id")
      .eq("workspace_id", WORKSPACE_ID)
      .eq("review_status", "approved")
      .not("valid_until", "is", null)
      .lt("valid_until", new Date().toISOString());

    for (const mem of expired || []) {
      await sb.from("assistant_memory").update({
        review_status: "stale",
        updated_at: new Date().toISOString(),
      } as any).eq("id", mem.id);
      expiredCount++;
    }

    // ── 3. UNUSED MEMORY FLAGGING ──
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: unused } = await sb
      .from("assistant_memory")
      .select("id, importance_score")
      .eq("workspace_id", WORKSPACE_ID)
      .eq("review_status", "approved")
      .in("memory_type", ["semantic", "procedural"])
      .lt("access_count", 3)
      .or(`last_accessed_at.is.null,last_accessed_at.lt.${ninetyDaysAgo}`);

    for (const mem of unused || []) {
      const newImportance = Math.max(0, (mem.importance_score || 0.5) * 0.9);
      const update: Record<string, unknown> = {
        importance_score: Math.round(newImportance * 1000) / 1000,
        updated_at: new Date().toISOString(),
      };
      if (newImportance < 0.2) {
        update.review_status = "stale";
      }
      await sb.from("assistant_memory").update(update as any).eq("id", mem.id);
      unusedCount++;
    }

    // ── 4. STALE NOTIFICATION ──
    const totalStale = decayedCount + expiredCount;
    if (totalStale > 0 || unusedCount > 0) {
      const { data: existing } = await sb
        .from("strategist_notifications")
        .select("id")
        .eq("workspace_id", WORKSPACE_ID)
        .eq("title", "Memory Review Required")
        .eq("read", false)
        .limit(1);

      if (!existing || existing.length === 0) {
        await sb.from("strategist_notifications").insert({
          workspace_id: WORKSPACE_ID,
          title: "Memory Review Required",
          body: `${totalStale + unusedCount} memories need your review — ${totalStale} stale, ${expiredCount} expired, ${unusedCount} unused`,
          read: false,
        } as any);
      }
    }

    const result = {
      ok: true,
      decayed: decayedCount,
      expired: expiredCount,
      unused_flagged: unusedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
    console.log("Memory decay complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("memory-decay-processor fatal:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
