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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const source = body.source || "scheduled";

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    // Find all workspaces with YouTube integration
    const { data: integrations } = await supabase
      .from("workspace_integrations")
      .select("workspace_id")
      .eq("integration_key", "youtube")
      .eq("enabled", true);

    if (!integrations?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No workspaces with YouTube integration", workspaces_processed: 0, total_proposals_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ workspace_id: string; success: boolean; proposals_created?: number; error?: string }> = [];

    for (const integration of integrations) {
      const workspaceId = integration.workspace_id;

      try {
        // Create daily run entry (allow re-runs for manual triggers)
        const runDate = new Date().toISOString().split("T")[0];

        // For manual runs, delete any existing run for today first
        if (source === "manual") {
          await supabase
            .from("strategist_daily_runs")
            .delete()
            .eq("workspace_id", workspaceId)
            .eq("run_date", runDate);
        }

        const { data: run, error: runError } = await supabase
          .from("strategist_daily_runs")
          .insert({
            workspace_id: workspaceId,
            run_date: runDate,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (runError) {
          if (runError.code === "23505") {
            results.push({ workspace_id: workspaceId, success: true, proposals_created: 0, error: "Already ran today" });
            continue;
          }
          throw runError;
        }

        const runId = run.id;

        // ── Fetch all video data ──────────────────────────────
        const [videoStatsRes, channelStatsRes, experimentsRes, goalRes] = await Promise.all([
          supabase
            .from("youtube_video_stats")
            .select("video_id, title, views, likes, comments, ctr_percent, avg_view_duration_seconds, published_at, description, tags, thumbnail_url")
            .eq("workspace_id", workspaceId)
            .order("views", { ascending: false })
            .limit(200),
          supabase
            .from("youtube_channel_stats")
            .select("subscriber_count, video_count, total_view_count, fetched_at")
            .eq("workspace_id", workspaceId)
            .order("fetched_at", { ascending: false })
            .limit(1),
          supabase
            .from("video_optimization_experiments")
            .select("video_id, status, experiment_type")
            .eq("workspace_id", workspaceId)
            .eq("status", "active"),
          supabase
            .from("growth_goals")
            .select("target_value, current_value, target_date")
            .eq("workspace_id", workspaceId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle(),
        ]);

        const videos = videoStatsRes.data ?? [];
        const channelStats = channelStatsRes.data?.[0] ?? null;
        const activeExperiments = experimentsRes.data ?? [];
        const goal = goalRes.data;

        if (videos.length === 0) {
          await supabase
            .from("strategist_daily_runs")
            .update({ status: "completed", recommendations_count: 0, completed_at: new Date().toISOString(), error_message: "No video data available" })
            .eq("id", runId);
          results.push({ workspace_id: workspaceId, success: true, proposals_created: 0, error: "No video data" });
          continue;
        }

        // Compute percentiles and averages
        const viewCounts = videos.map((v: any) => v.views || 0).sort((a: number, b: number) => a - b);
        const avgViews = Math.round(viewCounts.reduce((a: number, b: number) => a + b, 0) / viewCounts.length);
        const ctrValues = videos.map((v: any) => v.ctr_percent || 0).filter((c: number) => c > 0);
        const avgCtr = ctrValues.length > 0 ? ctrValues.reduce((a: number, b: number) => a + b, 0) / ctrValues.length : 0;

        const activeVideoIds = new Set(activeExperiments.map((e: any) => e.video_id));

        const enrichedVideos = videos.map((v: any) => {
          const idx = viewCounts.findIndex((vc: number) => vc >= (v.views || 0));
          const percentile = idx >= 0 ? Math.round((idx / viewCounts.length) * 100) : 100;
          return {
            ...v,
            percentile,
            quartile: percentile <= 25 ? "bottom" : percentile <= 50 ? "lower_mid" : percentile <= 75 ? "upper_mid" : "top",
            has_active_experiment: activeVideoIds.has(v.video_id),
          };
        });

        const videoDataSummary = enrichedVideos.slice(0, 50).map((v: any) => ({
          video_id: v.video_id,
          title: v.title,
          views: v.views,
          ctr_percent: v.ctr_percent,
          likes: v.likes,
          comments: v.comments,
          avg_view_duration_seconds: v.avg_view_duration_seconds,
          published_at: v.published_at,
          percentile: v.percentile,
          quartile: v.quartile,
          has_active_experiment: v.has_active_experiment,
          current_tags: v.tags,
        }));

        // ── Call LLM ──────────────────────────────────────────
        const systemPrompt = `You are a senior YouTube Growth Strategist. Analyze videos and generate exactly 4 optimization proposals as a JSON array.

Channel stats: ${channelStats ? `${channelStats.subscriber_count} subscribers, ${channelStats.total_view_count} total views` : "Unknown"}
Growth goal: ${goal ? `From ${goal.current_value} to ${goal.target_value} subscribers by ${goal.target_date}` : "Grow channel"}
Average views: ${avgViews}, Average CTR: ${avgCtr.toFixed(2)}%

RULES:
1. Generate EXACTLY 4 proposals. Mix types (title, description, tags, thumbnail).
2. SKIP videos with has_active_experiment=true.
3. Prioritize bottom/lower_mid quartile videos with decent impressions but low CTR.
4. Use real data from the videos - never fabricate metrics.
5. For title proposals: provide 3 title options.
6. For tag proposals: provide 15-20 tags.

Each proposal must be a JSON object with:
{
  "proposal_type": "video_title_optimization" | "video_description_optimization" | "video_tags_optimization" | "video_thumbnail_optimization",
  "video_id": "the YouTube video ID",
  "video_title": "current video title",
  "title": "short proposal title (max 80 chars)",
  "summary": "2-3 sentence explanation with specific metrics",
  "proposed_changes": {
    "titles": ["Option A", "Option B", "Option C"] // for title proposals
    // OR "description": "new description" // for description proposals
    // OR "tags": ["tag1", "tag2", ...] // for tag proposals
    // OR "thumbnail_concepts": ["concept 1", "concept 2"] // for thumbnail proposals
  },
  "optimization_proof": {
    "current_metrics": {"views_30d": N, "ctr": N, "percentile": N},
    "channel_average": {"views_30d": ${avgViews}, "ctr": ${avgCtr.toFixed(2)}},
    "youtube_best_practices": "specific practice being applied",
    "expected_impact": "expected improvement"
  },
  "thumbnail_prompts": ["detailed prompt for AI thumbnail generation"] // only for thumbnail proposals
  "confidence": 0.0-1.0
}

Return ONLY a valid JSON array of 4 proposals. No markdown, no explanation.`;

        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "minimax/minimax-m2.5",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Here are the videos to analyze:\n\n${JSON.stringify(videoDataSummary, null, 2)}` },
            ],
            max_tokens: 4096,
          }),
        });

        if (!openrouterRes.ok) {
          const errText = await openrouterRes.text();
          throw new Error(`OpenRouter error: ${openrouterRes.status} - ${errText}`);
        }

        const llmData = await openrouterRes.json();
        const responseText = llmData.choices?.[0]?.message?.content ?? "[]";

        // Parse proposals
        let proposals: any[];
        try {
          const jsonStr = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          proposals = JSON.parse(jsonStr);
          if (!Array.isArray(proposals)) proposals = [];
        } catch {
          console.error("Failed to parse LLM response:", responseText.slice(0, 500));
          proposals = [];
        }

        // ── Insert proposals ──────────────────────────────────
        const proposalIds: string[] = [];
        let proposalsCreated = 0;

        for (const p of proposals) {
          const proposalType = p.proposal_type || "video_title_optimization";
          const isThumbnail = proposalType === "video_thumbnail_optimization";

          const insertData: Record<string, unknown> = {
            workspace_id: workspaceId,
            entity_type: "video",
            entity_id: p.video_id || "00000000-0000-0000-0000-000000000000",
            video_id: p.video_id || null,
            proposal_type: proposalType,
            title: p.title || `Optimize ${p.video_title || "video"}`,
            summary: p.summary || null,
            proposed_changes: p.proposed_changes || {},
            optimization_proof: p.optimization_proof || null,
            confidence: p.confidence || 0.7,
            status: "pending",
          };

          if (isThumbnail) {
            insertData.requires_thumbnail_generation = true;
            insertData.thumbnail_prompts = p.thumbnail_prompts || [];
          }

          const { data: inserted, error: insertError } = await supabase
            .from("ai_proposals")
            .insert(insertData)
            .select("id")
            .single();

          if (insertError) {
            console.error("Failed to insert proposal:", insertError.message, { title: p.title });
          } else if (inserted) {
            proposalIds.push(inserted.id);
            proposalsCreated++;
          }
        }

        // Update daily run
        await supabase
          .from("strategist_daily_runs")
          .update({
            status: "completed",
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
              body: `Your AI strategist has analyzed your videos and found ${proposalsCreated} optimization opportunities. Review them to improve your CTR and views.`,
            });
        }

        results.push({ workspace_id: workspaceId, success: true, proposals_created: proposalsCreated });
      } catch (err: any) {
        console.error(`Strategist run failed for workspace ${workspaceId}:`, err.message);

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
