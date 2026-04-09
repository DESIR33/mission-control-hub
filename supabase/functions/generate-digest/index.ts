import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { workspace_id, settings } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const frequency = settings?.frequency || "daily";
    const agentScope: string[] = settings?.agent_scope || ["global", "claude", "chatgpt", "gemini"];
    const windowDays = frequency === "weekly" ? 7 : 1;
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();

    // ---- Gather data ----
    const sections: Record<string, any> = {};

    // New memories
    if (settings?.include_new_memories !== false) {
      const { data } = await sb
        .from("assistant_memory")
        .select("id, content, confidence_score, agent_id, created_at")
        .eq("workspace_id", workspace_id)
        .gte("created_at", since)
        .eq("status", "active")
        .in("agent_id", agentScope)
        .order("created_at", { ascending: false })
        .limit(50);
      sections.new_memories = data || [];
    }

    // Conflicts
    if (settings?.include_conflicts !== false) {
      const { data: pending } = await sb
        .from("memory_conflicts")
        .select("id, conflict_type, detected_at, status")
        .eq("workspace_id", workspace_id)
        .gte("detected_at", since)
        .limit(50);
      sections.conflicts = pending || [];
    }

    // Stale memories (not accessed in 30+ days)
    if (settings?.include_stale !== false) {
      const staleDate = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await sb
        .from("assistant_memory")
        .select("id, content, confidence_score, agent_id, last_accessed_at")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .lt("last_accessed_at", staleDate)
        .order("last_accessed_at", { ascending: true })
        .limit(20);
      sections.stale_memories = data || [];
    }

    // Health metrics
    if (settings?.include_health_score !== false) {
      const { data: allMems } = await sb
        .from("assistant_memory")
        .select("confidence_score")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .limit(500);
      const scores = (allMems || []).map((m: any) => m.confidence_score ?? 0);
      const avgConf = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

      const { count: totalCount } = await sb
        .from("assistant_memory")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .eq("status", "active");

      sections.health = {
        total_memories: totalCount || 0,
        avg_confidence: Math.round(avgConf * 100) / 100,
        stale_count: sections.stale_memories?.length ?? 0,
      };
    }

    // ---- Build summary prompt ----
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    let summary = "";

    if (openrouterKey) {
      const promptParts: string[] = [];
      promptParts.push(`Generate a concise memory digest summary for the ${frequency} period.`);

      if (sections.new_memories?.length) {
        promptParts.push(`New memories added (${sections.new_memories.length}): ${sections.new_memories.slice(0, 10).map((m: any) => m.content.slice(0, 100)).join(" | ")}`);
      }
      if (sections.conflicts?.length) {
        const resolved = sections.conflicts.filter((c: any) => c.status === "resolved").length;
        const pending = sections.conflicts.length - resolved;
        promptParts.push(`Conflicts: ${sections.conflicts.length} detected, ${resolved} resolved, ${pending} pending.`);
      }
      if (sections.stale_memories?.length) {
        promptParts.push(`${sections.stale_memories.length} memories flagged as stale (not retrieved in 30+ days).`);
      }
      if (sections.health) {
        promptParts.push(`Health: ${sections.health.total_memories} total memories, avg confidence ${(sections.health.avg_confidence * 100).toFixed(0)}%.`);
      }
      promptParts.push("Return a 3-4 sentence executive summary highlighting key patterns, risks, and recommendations. Be direct and actionable.");

      try {
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [
              { role: "system", content: "You are a memory systems analyst. Write concise, data-driven digest summaries." },
              { role: "user", content: promptParts.join("\n") },
            ],
          }),
        });
        const result = await resp.json();
        summary = result.choices?.[0]?.message?.content || "";
      } catch (e) {
        console.error("AI summary failed:", e);
        summary = "AI summary unavailable.";
      }
    }

    const digest = {
      generated_at: new Date().toISOString(),
      frequency,
      window_days: windowDays,
      summary,
      new_memories: sections.new_memories || [],
      conflicts: sections.conflicts || [],
      stale_memories: sections.stale_memories || [],
      health: sections.health || null,
    };

    // Save to digest_history
    await sb.from("digest_history").insert({
      workspace_id,
      content_json: digest,
      settings_snapshot: settings || {},
    });

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
