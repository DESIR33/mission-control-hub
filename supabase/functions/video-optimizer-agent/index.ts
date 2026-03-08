import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "minimax/minimax-m2.5";

interface VideoWithScore {
  youtube_video_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  published_at: string | null;
  lifetime_views: number;
  lifetime_likes: number;
  lifetime_comments: number;
  views_30d: number;
  impressions_30d: number;
  ctr_30d: number;
  subs_gained_30d: number;
  subs_lost_30d: number;
  avg_view_duration_30d: number;
  estimated_revenue_30d: number;
  health_score: number;
  channel_avg_views_30d: number;
  channel_avg_ctr_30d: number;
}

function computeHealthScore(
  video: { views_30d: number; ctr_30d: number; subs_gained_30d: number; subs_lost_30d: number; impressions_30d: number },
  channelAvgViews: number,
  channelAvgCtr: number
): number {
  // Score 0-100 where lower = worse performing
  const viewsRatio = channelAvgViews > 0 ? video.views_30d / channelAvgViews : 0;
  const ctrRatio = channelAvgCtr > 0 ? video.ctr_30d / channelAvgCtr : 0;
  const subRatio = video.subs_gained_30d > 0 ? video.subs_gained_30d / (video.subs_gained_30d + video.subs_lost_30d) : 0;
  const hasImpressions = video.impressions_30d > 100; // needs meaningful impressions

  const viewsScore = Math.min(viewsRatio * 40, 40);
  const ctrScore = Math.min(ctrRatio * 30, 30);
  const subScore = subRatio * 20;
  const impressionPenalty = hasImpressions ? 0 : -10;

  return Math.max(0, viewsScore + ctrScore + subScore + impressionPenalty + 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { workspace_id, max_videos = 10, model, run_all_workspaces } = body;

    // If triggered by cron, run for all workspaces that have videos
    if (run_all_workspaces) {
      const { data: workspaces } = await supabase
        .from("youtube_video_stats")
        .select("workspace_id")
        .limit(1000);
      
      const uniqueWsIds = [...new Set((workspaces || []).map((w: any) => w.workspace_id))];
      const allResults = [];
      
      for (const wsId of uniqueWsIds) {
        try {
          const res = await fetch(req.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
            body: JSON.stringify({ workspace_id: wsId, max_videos, model }),
          });
          allResults.push({ workspace_id: wsId, ...(await res.json()) });
        } catch (e: any) {
          allResults.push({ workspace_id: wsId, success: false, error: e.message });
        }
      }
      
      return new Response(JSON.stringify({ success: true, workspaces_processed: uniqueWsIds.length, results: allResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!workspace_id) throw new Error("Missing workspace_id");

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) throw new Error("OPENROUTER_API_KEY not configured");

    // ── 1. Fetch all videos ──────────────────────────────────────
    const { data: videos, error: vErr } = await supabase
      .from("youtube_video_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("published_at", { ascending: false });

    if (vErr) throw new Error(`Failed to fetch videos: ${vErr.message}`);
    if (!videos?.length) throw new Error("No videos found. Run YouTube sync first.");

    // ── 2. Fetch 30-day analytics per video ──────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

    const videoIds = videos.map((v: any) => v.youtube_video_id);

    const { data: analytics, error: aErr } = await supabase
      .from("youtube_video_analytics")
      .select("youtube_video_id, views, impressions, impressions_ctr, subscribers_gained, subscribers_lost, average_view_duration_seconds, estimated_revenue")
      .eq("workspace_id", workspace_id)
      .in("youtube_video_id", videoIds)
      .gte("date", dateStr);

    if (aErr) console.warn("Analytics fetch warning:", aErr.message);

    // Aggregate analytics per video
    const analyticsMap = new Map<string, {
      views: number; impressions: number; ctr_sum: number; ctr_count: number;
      subs_gained: number; subs_lost: number; avg_duration_sum: number; avg_duration_count: number;
      revenue: number;
    }>();

    for (const row of (analytics || [])) {
      const existing = analyticsMap.get(row.youtube_video_id) || {
        views: 0, impressions: 0, ctr_sum: 0, ctr_count: 0,
        subs_gained: 0, subs_lost: 0, avg_duration_sum: 0, avg_duration_count: 0, revenue: 0,
      };
      existing.views += row.views || 0;
      existing.impressions += row.impressions || 0;
      if (row.impressions_ctr) { existing.ctr_sum += row.impressions_ctr; existing.ctr_count++; }
      existing.subs_gained += row.subscribers_gained || 0;
      existing.subs_lost += row.subscribers_lost || 0;
      if (row.average_view_duration_seconds) { existing.avg_duration_sum += row.average_view_duration_seconds; existing.avg_duration_count++; }
      existing.revenue += Number(row.estimated_revenue) || 0;
      analyticsMap.set(row.youtube_video_id, existing);
    }

    // ── 3. Score & rank ──────────────────────────────────────────
    const totalViews30d = Array.from(analyticsMap.values()).reduce((s, a) => s + a.views, 0);
    const videosWithAnalytics = Array.from(analyticsMap.keys()).length || 1;
    const channelAvgViews = totalViews30d / videosWithAnalytics;

    const totalCtr = Array.from(analyticsMap.values()).reduce((s, a) => s + (a.ctr_count > 0 ? a.ctr_sum / a.ctr_count : 0), 0);
    const channelAvgCtr = totalCtr / videosWithAnalytics;

    const scoredVideos: VideoWithScore[] = videos.map((v: any) => {
      const a = analyticsMap.get(v.youtube_video_id);
      const views30d = a?.views || 0;
      const impressions30d = a?.impressions || 0;
      const ctr30d = a && a.ctr_count > 0 ? a.ctr_sum / a.ctr_count : 0;
      const subsGained = a?.subs_gained || 0;
      const subsLost = a?.subs_lost || 0;
      const avgDuration = a && a.avg_duration_count > 0 ? a.avg_duration_sum / a.avg_duration_count : 0;
      const revenue = a?.revenue || 0;

      return {
        youtube_video_id: v.youtube_video_id,
        title: v.title,
        description: v.description,
        tags: v.tags,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        lifetime_views: v.views || 0,
        lifetime_likes: v.likes || 0,
        lifetime_comments: v.comments || 0,
        views_30d: views30d,
        impressions_30d: impressions30d,
        ctr_30d: ctr30d,
        subs_gained_30d: subsGained,
        subs_lost_30d: subsLost,
        avg_view_duration_30d: avgDuration,
        estimated_revenue_30d: revenue,
        health_score: computeHealthScore(
          { views_30d: views30d, ctr_30d: ctr30d, subs_gained_30d: subsGained, subs_lost_30d: subsLost, impressions_30d: impressions30d },
          channelAvgViews,
          channelAvgCtr
        ),
        channel_avg_views_30d: channelAvgViews,
        channel_avg_ctr_30d: channelAvgCtr,
      };
    });

    // Sort by health score ascending (worst first), take top N
    scoredVideos.sort((a, b) => a.health_score - b.health_score);
    const underperformers = scoredVideos.slice(0, Math.min(max_videos, scoredVideos.length));

    if (!underperformers.length) {
      return new Response(JSON.stringify({ success: true, message: "No videos to optimize", proposals_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. AI Analysis for each underperformer ───────────────────
    const toolDefs = [
      {
        type: "function",
        function: {
          name: "create_video_optimization",
          description: "Create optimization proposals for a YouTube video. Call this once per video with ALL recommendations.",
          parameters: {
            type: "object",
            properties: {
              youtube_video_id: { type: "string", description: "The YouTube video ID" },
              current_title: { type: "string" },
              title_options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["title", "rationale"],
                },
                description: "3-5 alternative title options with rationale",
              },
              optimized_description: {
                type: "string",
                description: "Full optimized description with timestamps, keywords, CTAs",
              },
              description_rationale: { type: "string" },
              suggested_tags: {
                type: "array",
                items: { type: "string" },
                description: "Complete tag set (up to 30 tags)",
              },
              tags_rationale: { type: "string" },
              thumbnail_concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    concept: { type: "string", description: "Thumbnail concept description" },
                    text_overlay: { type: "string", description: "Text to show on thumbnail" },
                    emotional_hook: { type: "string", description: "What emotion this targets" },
                    composition: { type: "string", description: "Layout and visual composition" },
                  },
                  required: ["concept", "text_overlay", "emotional_hook", "composition"],
                },
                description: "2-3 thumbnail concepts",
              },
              priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Optimization priority" },
              diagnosis: { type: "string", description: "Brief diagnosis of why this video is underperforming" },
            },
            required: ["youtube_video_id", "current_title", "title_options", "optimized_description", "suggested_tags", "thumbnail_concepts", "priority", "diagnosis"],
          },
        },
      },
    ];

    const systemPrompt = `You are a YouTube optimization expert. You analyze video performance data and provide specific, actionable optimization recommendations.

RULES:
- Be decisive. Don't hedge — give your best recommendations.
- Titles should be curiosity-driven, searchable, and under 70 characters.
- Descriptions should be SEO-optimized with keywords in the first 2 lines, include timestamps if relevant, and have clear CTAs.
- Tags should cover broad + niche keywords, competitor tags, and related terms.
- Thumbnail concepts should prioritize high contrast, emotional faces, minimal text (3-5 words max), and curiosity gaps.
- Consider the video's age — older videos can be revived with metadata updates.
- For each video, call create_video_optimization with your complete analysis.

CHANNEL CONTEXT:
- Channel average 30-day views: ${Math.round(channelAvgViews)}
- Channel average CTR: ${(channelAvgCtr * 100).toFixed(2)}%
`;

    let totalProposals = 0;
    const results: Array<{ video_id: string; title: string; success: boolean; error?: string }> = [];

    // Process videos in batches of 3 to avoid timeout
    for (let i = 0; i < underperformers.length; i += 3) {
      const batch = underperformers.slice(i, i + 3);

      const videoContexts = batch.map((v) => `
VIDEO: ${v.title}
ID: ${v.youtube_video_id}
Published: ${v.published_at || "unknown"}
Health Score: ${v.health_score.toFixed(1)}/100

Current Metadata:
- Title: ${v.title}
- Description: ${v.description ? v.description.substring(0, 500) : "Not available"}
- Tags: ${v.tags?.join(", ") || "None"}
- Thumbnail: ${v.thumbnail_url || "Not available"}

30-Day Performance:
- Views: ${v.views_30d} (channel avg: ${Math.round(v.channel_avg_views_30d)})
- CTR: ${(v.ctr_30d * 100).toFixed(2)}% (channel avg: ${(v.channel_avg_ctr_30d * 100).toFixed(2)}%)
- Impressions: ${v.impressions_30d}
- Subscribers gained: ${v.subs_gained_30d} | lost: ${v.subs_lost_30d}
- Avg view duration: ${Math.round(v.avg_view_duration_30d)}s
- Revenue: $${v.estimated_revenue_30d.toFixed(2)}

Lifetime Stats:
- Views: ${v.lifetime_views}
- Likes: ${v.lifetime_likes}
- Comments: ${v.lifetime_comments}
`).join("\n---\n");

      try {
        const aiRes = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
          },
          body: JSON.stringify({
            model: model || DEFAULT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Analyze these underperforming videos and call create_video_optimization for EACH video:\n\n${videoContexts}`,
              },
            ],
            tools: toolDefs,
            tool_choice: "auto",
            max_tokens: 8000,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("AI API error:", errText);
          batch.forEach((v) => results.push({ video_id: v.youtube_video_id, title: v.title, success: false, error: "AI API error" }));
          continue;
        }

        const aiData = await aiRes.json();
        const toolCalls = aiData.choices?.[0]?.message?.tool_calls || [];

        for (const tc of toolCalls) {
          if (tc.function?.name !== "create_video_optimization") continue;

          try {
            const args = JSON.parse(tc.function.arguments);
            const video = batch.find((v) => v.youtube_video_id === args.youtube_video_id) || batch[0];

            // Create title optimization proposal
            if (args.title_options?.length) {
              const { error: tErr } = await supabase.from("ai_proposals").insert({
                workspace_id,
                title: `Title Optimization: ${args.current_title || video.title}`,
                description: args.diagnosis || "Video title needs optimization",
                type: "video_title_optimization",
                status: "pending",
                video_id: args.youtube_video_id,
                content: {
                  current_title: args.current_title || video.title,
                  title_options: args.title_options,
                  priority: args.priority,
                },
                confidence: args.priority === "critical" ? 0.95 : args.priority === "high" ? 0.85 : 0.7,
                metadata: { health_score: video.health_score, views_30d: video.views_30d, ctr_30d: video.ctr_30d },
              });
              if (!tErr) totalProposals++;
            }

            // Create description optimization proposal
            if (args.optimized_description) {
              const { error: dErr } = await supabase.from("ai_proposals").insert({
                workspace_id,
                title: `Description Optimization: ${video.title}`,
                description: args.description_rationale || "Video description needs optimization",
                type: "video_description_optimization",
                status: "pending",
                video_id: args.youtube_video_id,
                content: {
                  current_description: video.description?.substring(0, 500),
                  optimized_description: args.optimized_description,
                  rationale: args.description_rationale,
                },
                confidence: 0.8,
                metadata: { health_score: video.health_score },
              });
              if (!dErr) totalProposals++;
            }

            // Create tags optimization proposal
            if (args.suggested_tags?.length) {
              const { error: tagErr } = await supabase.from("ai_proposals").insert({
                workspace_id,
                title: `Tags Optimization: ${video.title}`,
                description: args.tags_rationale || "Video tags need optimization",
                type: "video_tags_optimization",
                status: "pending",
                video_id: args.youtube_video_id,
                content: {
                  current_tags: video.tags || [],
                  suggested_tags: args.suggested_tags,
                  rationale: args.tags_rationale,
                },
                confidence: 0.8,
                metadata: { health_score: video.health_score },
              });
              if (!tagErr) totalProposals++;
            }

            // Create thumbnail optimization proposal
            if (args.thumbnail_concepts?.length) {
              const { error: thErr } = await supabase.from("ai_proposals").insert({
                workspace_id,
                title: `Thumbnail Optimization: ${video.title}`,
                description: "New thumbnail concepts to improve CTR",
                type: "video_thumbnail_optimization",
                status: "pending",
                video_id: args.youtube_video_id,
                content: {
                  current_thumbnail: video.thumbnail_url,
                  thumbnail_concepts: args.thumbnail_concepts,
                },
                confidence: 0.85,
                metadata: { health_score: video.health_score, ctr_30d: video.ctr_30d, channel_avg_ctr: video.channel_avg_ctr_30d },
              });
              if (!thErr) totalProposals++;
            }

            results.push({ video_id: args.youtube_video_id, title: video.title, success: true });
          } catch (parseErr: any) {
            console.error("Tool call parse error:", parseErr);
          }
        }
      } catch (batchErr: any) {
        console.error("Batch error:", batchErr);
        batch.forEach((v) => results.push({ video_id: v.youtube_video_id, title: v.title, success: false, error: batchErr.message }));
      }
    }

    // ── 5. Save summary to memory ────────────────────────────────
    const summaryContent = `Video Optimization Run: Analyzed ${underperformers.length} underperforming videos, created ${totalProposals} optimization proposals. Top underperformers: ${underperformers.slice(0, 3).map(v => `"${v.title}" (score: ${v.health_score.toFixed(0)})`).join(", ")}`;

    await supabase.from("assistant_memory").insert({
      workspace_id,
      content: summaryContent,
      origin: "agent",
      tags: ["video-optimization", "agent-run"],
    });

    // ── 6. Log execution ─────────────────────────────────────────
    await supabase.from("agent_executions").insert({
      workspace_id,
      agent_slug: "video-optimizer",
      trigger_type: "manual",
      status: "completed",
      input: { max_videos, videos_analyzed: underperformers.length },
      output: { proposals_created: totalProposals, results },
      proposals_created: totalProposals,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        videos_analyzed: underperformers.length,
        proposals_created: totalProposals,
        results,
        scored_videos: underperformers.map((v) => ({
          video_id: v.youtube_video_id,
          title: v.title,
          health_score: Math.round(v.health_score),
          views_30d: v.views_30d,
          ctr_30d: v.ctr_30d,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
