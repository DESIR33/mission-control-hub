import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Status breakdown
    const { data: allMemories } = await sb
      .from("assistant_memory")
      .select("id, status, review_status, memory_type, agent_id, entity_type, confidence_score, importance_score, access_count, is_pinned, created_at, last_accessed_at, source_type, tags")
      .eq("workspace_id", workspace_id);

    const memories = allMemories || [];

    const statusCounts: Record<string, number> = {};
    const reviewCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    let totalAccess = 0;
    let totalConfidence = 0;
    let pinnedCount = 0;
    const accessList: { id: string; content?: string; access_count: number }[] = [];
    const freshnessDistribution = { week: 0, month: 0, quarter: 0, older: 0 };
    const decayAlerts: any[] = [];

    const now = Date.now();
    const WEEK = 7 * 86400000;
    const MONTH = 30 * 86400000;
    const QUARTER = 90 * 86400000;

    for (const m of memories) {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      reviewCounts[m.review_status || "unknown"] = (reviewCounts[m.review_status || "unknown"] || 0) + 1;
      typeCounts[m.memory_type || "unknown"] = (typeCounts[m.memory_type || "unknown"] || 0) + 1;
      agentCounts[m.agent_id || "unknown"] = (agentCounts[m.agent_id || "unknown"] || 0) + 1;
      if (m.entity_type) entityCounts[m.entity_type] = (entityCounts[m.entity_type] || 0) + 1;
      sourceCounts[m.source_type || "unknown"] = (sourceCounts[m.source_type || "unknown"] || 0) + 1;
      if (m.is_pinned) pinnedCount++;
      totalAccess += m.access_count || 0;
      totalConfidence += m.confidence_score || 0;
      accessList.push({ id: m.id, access_count: m.access_count || 0 });

      // Tags
      if (m.tags) {
        for (const t of m.tags) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }

      // Freshness (based on created_at)
      const age = now - new Date(m.created_at).getTime();
      if (age < WEEK) freshnessDistribution.week++;
      else if (age < MONTH) freshnessDistribution.month++;
      else if (age < QUARTER) freshnessDistribution.quarter++;
      else freshnessDistribution.older++;

      // Decay alerts: active memories with low confidence or no access in 60+ days
      if (m.status === "active") {
        const lastAccess = m.last_accessed_at ? now - new Date(m.last_accessed_at).getTime() : Infinity;
        const isStale = lastAccess > 60 * 86400000;
        const isLowConf = (m.confidence_score || 0) < 0.3;
        if (isStale || isLowConf) {
          decayAlerts.push({
            id: m.id,
            reason: isStale && isLowConf ? "stale_and_low_confidence" : isStale ? "stale" : "low_confidence",
            confidence_score: m.confidence_score,
            days_since_access: lastAccess === Infinity ? null : Math.floor(lastAccess / 86400000),
          });
        }
      }
    }

    // Sort access list
    accessList.sort((a, b) => b.access_count - a.access_count);

    // Duplication rate from cluster-memories (memory_relationships with type related_to + high strength)
    const { count: dupCount } = await sb
      .from("memory_relationships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("relationship_type", "related_to")
      .gte("strength", 0.90);

    // Conflict stats
    const { data: conflicts } = await sb
      .from("memory_conflicts")
      .select("status")
      .eq("workspace_id", workspace_id);

    const conflictCounts: Record<string, number> = {};
    (conflicts || []).forEach((c: any) => {
      conflictCounts[c.status] = (conflictCounts[c.status] || 0) + 1;
    });

    const total = memories.length;
    const avgConfidence = total > 0 ? totalConfidence / total : 0;
    const avgAccess = total > 0 ? totalAccess / total : 0;

    // Top tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    const result = {
      total_memories: total,
      pinned_count: pinnedCount,
      avg_confidence: +avgConfidence.toFixed(3),
      avg_access_count: +avgAccess.toFixed(1),
      status_breakdown: statusCounts,
      review_breakdown: reviewCounts,
      type_breakdown: typeCounts,
      agent_breakdown: agentCounts,
      entity_coverage: entityCounts,
      source_breakdown: sourceCounts,
      freshness_distribution: freshnessDistribution,
      decay_alerts: decayAlerts.slice(0, 20),
      decay_alert_count: decayAlerts.length,
      most_accessed: accessList.slice(0, 5),
      least_accessed: accessList.filter(a => a.access_count === 0).length,
      near_duplicate_count: dupCount || 0,
      conflict_breakdown: conflictCounts,
      top_tags: topTags,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
