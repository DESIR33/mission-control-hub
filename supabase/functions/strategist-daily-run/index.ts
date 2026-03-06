import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const STRATEGIST_PROMPT = `You are a senior YouTube Growth Strategist performing your daily video optimization audit. You take a McKinsey-style analytical approach: data-driven, structured, and evidence-based.

STEP 1 — DATA COLLECTION:
- Use query_all_video_analytics to fetch ALL videos with their 30-day performance metrics and percentile rankings.
- Use memory_search with query "video optimization experiment results" to retrieve past experiment outcomes.
- Use query_experiments to see active and completed experiments and their results.
- Use query_competitors to get competitor data for benchmarking.

STEP 2 — ANALYSIS (McKinsey MECE Framework):
- Rank all videos by 30-day views into performance quartiles:
  * BOTTOM 25%: Primary candidates for title + thumbnail optimization (highest impact potential)
  * LOWER-MID 25-50%: Candidates for description + tags optimization (moderate lift potential)
  * UPPER-MID 50-75%: Monitor — optimize only if CTR is below channel average
  * TOP 25%: Leave alone unless CTR is significantly below average
- For each candidate, analyze: topic, current title structure, CTR vs channel average, impressions trend
- Cross-reference with memory: skip videos that had recent failed experiments

STEP 3 — COMPETITOR BENCHMARKING:
- For each candidate video's topic, find similar competitor content
- Identify title patterns, thumbnail styles, and tag strategies that outperform
- Note specific competitor videos and their metrics as proof points

STEP 4 — GENERATE EXACTLY 4 RECOMMENDATIONS:
Select the 4 highest-impact optimizations. Mix of types is ideal (e.g., 2 title, 1 thumbnail, 1 tags/description).

For each recommendation, create a proposal using create_proposal with:
- proposal_type: one of "video_title_optimization", "video_description_optimization", "video_tags_optimization", "video_thumbnail_optimization"
- entity_type: "video"
- video_id: the YouTube video ID
- title: "Optimize [type] for: [video title]" (max 80 chars)
- summary: 2-3 sentences explaining the recommendation and expected impact
- proposed_changes: For titles → {titles: ["Option A", "Option B", "Option C"]}. For descriptions → {description: "new description"}. For tags → {tags: ["tag1", "tag2", ...]}. For thumbnails → {thumbnail_concepts: ["concept 1", "concept 2"]}
- optimization_proof: {
    current_metrics: {views_30d: N, ctr: N, impressions: N, percentile: N},
    channel_average: {views_30d: N, ctr: N},
    competitor_comparison: "Video X by Channel Y on same topic has N views with title format '...'",
    youtube_best_practices: "Specific practice being applied (e.g., front-loading keywords, curiosity gap)",
    expected_impact: "Based on similar optimizations, we expect a N% increase in CTR/views"
  }
- thumbnail_prompts: (only for thumbnail proposals) ["Detailed Nano Banana 2 prompt for generating the thumbnail, include style, composition, colors, text overlay, expressions"]
- confidence: 0.0-1.0 based on evidence strength

YOUTUBE BEST PRACTICES TO REFERENCE:
- Titles: 50-60 characters, front-load primary keyword, use power words (Ultimate, Complete, Proven, Secret), create curiosity gap, include numbers when relevant
- Thumbnails: High contrast colors, expressive human faces with emotion, minimal text (3-4 words MAX), bright/saturated colors, clear visual hierarchy, mobile-readable at small sizes
- Descriptions: Primary keywords in first 2 lines (shown in search), timestamps for chapters, relevant links, call-to-action
- Tags: Mix of broad (topic area) and specific (exact topic), include common misspellings, competitor channel names if relevant, 15-20 tags total

STEP 5 — LEARNING:
- Use save_insight to record today's analysis: which videos were selected, what patterns you noticed, what the channel's current weak spots are. Tag it with ["daily_audit", "video_optimization"].

CRITICAL RULES:
1. You MUST create exactly 4 proposals. No more, no less.
2. Every recommendation MUST include specific numbers from the data — never fabricate metrics.
3. Skip videos with active experiments (check query_experiments for status: "active").
4. Prioritize videos with high impressions but low CTR (untapped potential).
5. If past experiments show a pattern (e.g., "curiosity gap titles increase CTR 15%"), reference it.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Find all workspaces with YouTube integration
    const { data: integrations } = await supabase
      .from("workspace_integrations")
      .select("workspace_id")
      .eq("integration_key", "youtube")
      .eq("enabled", true);

    if (!integrations?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No workspaces with YouTube integration", workspaces_processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ workspace_id: string; success: boolean; proposals_created?: number; error?: string }> = [];

    for (const integration of integrations) {
      const workspaceId = integration.workspace_id;

      try {
        // Create daily run entry
        const { data: run, error: runError } = await supabase
          .from("strategist_daily_runs")
          .insert({
            workspace_id: workspaceId,
            run_date: new Date().toISOString().split("T")[0],
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (runError) {
          // Likely duplicate for today — skip
          if (runError.code === "23505") {
            results.push({ workspace_id: workspaceId, success: true, proposals_created: 0, error: "Already ran today" });
            continue;
          }
          throw runError;
        }

        const runId = run.id;

        // Call agent orchestrator with the strategist prompt
        const orchestratorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-orchestrator`;
        const agentRes = await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            agent_slug: "content-strategist",
            input: { message: STRATEGIST_PROMPT },
            trigger_type: "scheduled",
          }),
        });

        if (!agentRes.ok) {
          const errText = await agentRes.text();
          throw new Error(`Orchestrator error: ${errText}`);
        }

        const agentData = await agentRes.json();
        const proposalsCreated = agentData.proposals_created || 0;

        // Collect proposal IDs created in this run
        const { data: recentProposals } = await supabase
          .from("ai_proposals")
          .select("id")
          .eq("workspace_id", workspaceId)
          .in("proposal_type", [
            "video_title_optimization",
            "video_description_optimization",
            "video_tags_optimization",
            "video_thumbnail_optimization",
          ])
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(4);

        const proposalIds = (recentProposals || []).map((p: any) => p.id);

        // Update daily run
        await supabase
          .from("strategist_daily_runs")
          .update({
            status: "completed",
            execution_id: agentData.execution_id || null,
            recommendations_count: proposalsCreated,
            proposal_ids: proposalIds,
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);

        // Create notification
        if (proposalsCreated > 0) {
          await supabase
            .from("strategist_notifications")
            .insert({
              workspace_id: workspaceId,
              run_id: runId,
              title: `${proposalsCreated} Video Optimization Recommendations Ready`,
              body: `Your daily AI strategist has analyzed all videos and found ${proposalsCreated} optimization opportunities. Review them to improve your CTR and views.`,
            });
        }

        results.push({ workspace_id: workspaceId, success: true, proposals_created: proposalsCreated });
      } catch (err: any) {
        console.error(`Strategist run failed for workspace ${workspaceId}:`, err.message);

        // Update run as failed if it exists
        await supabase
          .from("strategist_daily_runs")
          .update({
            status: "failed",
            error_message: err.message,
            completed_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspaceId)
          .eq("run_date", new Date().toISOString().split("T")[0]);

        results.push({ workspace_id: workspaceId, success: false, error: err.message });
      }
    }

    const totalProposals = results.reduce((sum, r) => sum + (r.proposals_created || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        workspaces_processed: results.length,
        total_proposals_created: totalProposals,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Strategist daily run error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
