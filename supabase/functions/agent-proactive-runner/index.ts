import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const PROACTIVE_PROMPTS: Record<string, string> = {
  "competitor-analyst":
    "Run a proactive competitor analysis. Check all tracked competitors for recent changes in subscriber count, upload frequency, and notable new videos. If you find anything noteworthy (e.g., a competitor grew significantly, changed upload frequency, or published a viral video), create proposals with specific recommendations for how Hustling Labs should respond.",
  "content-strategist":
    "Run a proactive content strategy review. Analyze recent video performance and the current content pipeline. Identify which recent videos overperformed or underperformed expectations, and suggest 3-5 new video topics based on what's working. Create proposals for each content suggestion.",
  "growth-optimizer":
    "Run a proactive growth check. Analyze the current subscriber growth trajectory and compare it against active growth goals. Identify if growth is on pace, accelerating, or slowing. Suggest specific actions to accelerate growth. Create proposals for the most impactful growth tactics.",
  "audience-analyst":
    "Run a proactive audience analysis. Review recent comments for sentiment trends, recurring questions, and engagement patterns. Identify any shifts in audience sentiment or emerging topics the audience cares about. Create proposals for engagement improvements.",
  "revenue-optimizer":
    "Run a proactive revenue review. Analyze the sponsorship deal pipeline, affiliate program performance, and recent transactions. Identify stale deals, underperforming affiliates, and new monetization opportunities. Create proposals for revenue-generating actions.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, agent_slugs } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth: require valid user (workspace member) or service role key
    const auth = await validateCallerOrServiceRole(req, workspace_id);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseAdmin();

    // Load enabled agents (system-level or workspace-level)
    let query = supabase
      .from("agent_definitions")
      .select("slug, name")
      .eq("enabled", true)
      .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`);

    if (agent_slugs?.length) {
      query = query.in("slug", agent_slugs);
    }

    const { data: agents } = await query;

    if (!agents?.length) {
      return new Response(
        JSON.stringify({ success: true, agents_run: 0, message: "No enabled agents found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ agent: string; success: boolean; proposals_created?: number; error?: string }> = [];

    for (const agent of agents) {
      const proactivePrompt = PROACTIVE_PROMPTS[agent.slug];
      if (!proactivePrompt) continue;

      try {
        const orchestratorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-orchestrator`;
        const res = await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            workspace_id,
            agent_slug: agent.slug,
            input: { message: proactivePrompt },
            trigger_type: "scheduled",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          results.push({ agent: agent.slug, success: false, error: errText });
          continue;
        }

        const data = await res.json();
        results.push({
          agent: agent.slug,
          success: true,
          proposals_created: data.proposals_created || 0,
        });
      } catch (err: any) {
        results.push({ agent: agent.slug, success: false, error: err.message });
      }
    }

    const totalProposals = results.reduce(
      (sum, r) => sum + (r.proposals_created || 0),
      0
    );

    return new Response(
      JSON.stringify({
        success: true,
        agents_run: results.length,
        total_proposals_created: totalProposals,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Proactive runner error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
