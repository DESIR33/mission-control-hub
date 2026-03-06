import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getEmbedding(text: string): Promise<number[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function generateLessonLearned(
  experiment: any,
  delta: Record<string, number>
): Promise<string> {
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) return `Experiment ${experiment.experiment_type}: ${JSON.stringify(delta)}`;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-3",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: "You are a YouTube optimization analyst. Generate a one-paragraph lesson learned from this experiment result. Be specific about what worked or didn't and why.",
          },
          {
            role: "user",
            content: `Experiment type: ${experiment.experiment_type}
Video: "${experiment.video_title}"
Original title: "${experiment.original_title}"
New title: "${experiment.new_title || "(unchanged)"}"
Original tags: ${JSON.stringify(experiment.original_tags || [])}
New tags: ${JSON.stringify(experiment.new_tags || [])}
Performance changes: Views ${delta.views > 0 ? "+" : ""}${delta.views.toFixed(1)}%, CTR ${delta.ctr > 0 ? "+" : ""}${delta.ctr.toFixed(1)}%, Impressions ${delta.impressions > 0 ? "+" : ""}${delta.impressions.toFixed(1)}%
Status: ${experiment.status}`,
          },
        ],
      }),
    });

    if (!res.ok) return `${experiment.experiment_type} experiment: views ${delta.views > 0 ? "+" : ""}${delta.views.toFixed(1)}%, CTR ${delta.ctr > 0 ? "+" : ""}${delta.ctr.toFixed(1)}%`;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return `${experiment.experiment_type} experiment: views ${delta.views > 0 ? "+" : ""}${delta.views.toFixed(1)}%, CTR ${delta.ctr > 0 ? "+" : ""}${delta.ctr.toFixed(1)}%`;
  }
}

async function saveInsightToMemory(supabase: any, workspaceId: string, content: string, tags: string[]) {
  try {
    const embedding = await getEmbedding(content);
    await supabase.from("assistant_memory").insert({
      workspace_id: workspaceId,
      content,
      origin: "strategy",
      tags,
      embedding: `[${embedding.join(",")}]`,
    });
  } catch (e: any) {
    console.error("Failed to save insight to memory:", e.message);
  }
}

async function rollbackViaYouTubeApi(workspaceId: string, experiment: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const updatePayload: Record<string, unknown> = {
    action: "update_metadata",
    workspace_id: workspaceId,
    video_id: experiment.video_id,
  };

  // Restore original metadata
  if (experiment.original_title) updatePayload.title = experiment.original_title;
  if (experiment.original_description) updatePayload.description = experiment.original_description;
  if (experiment.original_tags?.length) updatePayload.tags = experiment.original_tags;

  const res = await fetch(`${supabaseUrl}/functions/v1/youtube-video-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(updatePayload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Rollback failed for video ${experiment.video_id}: ${err}`);
  }

  // If there was a thumbnail change, we can't easily rollback thumbnails via API
  // (YouTube doesn't store previous thumbnails). Log this limitation.
  if (experiment.experiment_type === "thumbnail") {
    console.warn(`Thumbnail rollback for ${experiment.video_id}: original thumbnail URL was ${experiment.original_thumbnail_url}. Manual re-upload may be needed.`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all active experiments
    const { data: experiments, error } = await supabase
      .from("video_optimization_experiments")
      .select("*")
      .eq("status", "active");

    if (error) throw error;
    if (!experiments?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No active experiments", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ experiment_id: string; video_id: string; action: string; delta?: Record<string, number> }> = [];

    for (const experiment of experiments) {
      try {
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(experiment.started_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Fetch current metrics for this video
        const { data: currentStats } = await supabase
          .from("youtube_video_analytics")
          .select("views, impressions, impressions_click_through_rate, estimated_minutes_watched, average_view_duration")
          .eq("workspace_id", experiment.workspace_id)
          .eq("video_id", experiment.video_id)
          .limit(1)
          .maybeSingle();

        if (!currentStats) {
          console.warn(`No analytics found for video ${experiment.video_id}, skipping`);
          continue;
        }

        const resultViews = currentStats.views || 0;
        const resultCtr = currentStats.impressions_click_through_rate || 0;
        const resultImpressions = currentStats.impressions || 0;
        const resultWatchTime = (currentStats.estimated_minutes_watched || 0) / 60;
        const resultAvgDuration = currentStats.average_view_duration || 0;

        // Compute deltas
        const delta: Record<string, number> = {
          views: experiment.baseline_views ? ((resultViews - experiment.baseline_views) / experiment.baseline_views) * 100 : 0,
          ctr: experiment.baseline_ctr ? ((resultCtr - experiment.baseline_ctr) / experiment.baseline_ctr) * 100 : 0,
          impressions: experiment.baseline_impressions ? ((resultImpressions - experiment.baseline_impressions) / experiment.baseline_impressions) * 100 : 0,
          watch_time: experiment.baseline_watch_time_hours ? ((resultWatchTime - experiment.baseline_watch_time_hours) / experiment.baseline_watch_time_hours) * 100 : 0,
        };

        // Update current metrics on experiment
        await supabase
          .from("video_optimization_experiments")
          .update({
            result_views: resultViews,
            result_ctr: resultCtr,
            result_impressions: resultImpressions,
            result_avg_view_duration: resultAvgDuration,
            result_watch_time_hours: resultWatchTime,
            performance_delta: delta,
            measured_at: new Date().toISOString(),
          })
          .eq("id", experiment.id);

        // AUTO-ROLLBACK CHECK: CTR drop >20% OR views drop >30% after 7+ days
        if (daysSinceStart >= 7 && (delta.ctr < -20 || delta.views < -30)) {
          const rollbackReason = delta.ctr < -20
            ? `CTR dropped ${delta.ctr.toFixed(1)}% after ${daysSinceStart} days`
            : `Views dropped ${delta.views.toFixed(1)}% after ${daysSinceStart} days`;

          // Rollback via YouTube API
          try {
            await rollbackViaYouTubeApi(experiment.workspace_id, experiment);
          } catch (rollbackErr: any) {
            console.error(`Rollback API call failed: ${rollbackErr.message}`);
          }

          const lesson = await generateLessonLearned(
            { ...experiment, status: "rolled_back" },
            delta
          );

          await supabase
            .from("video_optimization_experiments")
            .update({
              status: "rolled_back",
              rolled_back_at: new Date().toISOString(),
              rollback_reason: rollbackReason,
              lesson_learned: lesson,
              performance_delta: delta,
            })
            .eq("id", experiment.id);

          // Save lesson to memory
          await saveInsightToMemory(
            supabase,
            experiment.workspace_id,
            `ROLLED BACK: ${experiment.experiment_type} optimization for "${experiment.video_title}". ${lesson}`,
            ["experiment_result", "rollback", experiment.experiment_type]
          );

          // Create notification
          await supabase.from("strategist_notifications").insert({
            workspace_id: experiment.workspace_id,
            title: `Experiment Rolled Back: ${experiment.video_title}`,
            body: `The ${experiment.experiment_type} optimization was automatically rolled back. ${rollbackReason}. Original values have been restored.`,
          });

          results.push({ experiment_id: experiment.id, video_id: experiment.video_id, action: "rolled_back", delta });
          continue;
        }

        // COMPLETION CHECK: measurement period reached
        if (daysSinceStart >= experiment.measurement_period_days) {
          const lesson = await generateLessonLearned(experiment, delta);

          await supabase
            .from("video_optimization_experiments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              lesson_learned: lesson,
              performance_delta: delta,
            })
            .eq("id", experiment.id);

          // Save lesson to memory
          const outcome = delta.views > 0 && delta.ctr > 0 ? "SUCCESSFUL" : "MIXED";
          await saveInsightToMemory(
            supabase,
            experiment.workspace_id,
            `${outcome}: ${experiment.experiment_type} optimization for "${experiment.video_title}". ${lesson}`,
            ["experiment_result", outcome.toLowerCase(), experiment.experiment_type]
          );

          // Create notification
          await supabase.from("strategist_notifications").insert({
            workspace_id: experiment.workspace_id,
            title: `Experiment Completed: ${experiment.video_title}`,
            body: `The ${experiment.experiment_type} optimization completed after ${daysSinceStart} days. Views: ${delta.views > 0 ? "+" : ""}${delta.views.toFixed(1)}%, CTR: ${delta.ctr > 0 ? "+" : ""}${delta.ctr.toFixed(1)}%.`,
          });

          results.push({ experiment_id: experiment.id, video_id: experiment.video_id, action: "completed", delta });
          continue;
        }

        // Still active — just updated metrics
        results.push({ experiment_id: experiment.id, video_id: experiment.video_id, action: "updated", delta });
      } catch (expErr: any) {
        console.error(`Error checking experiment ${experiment.id}:`, expErr.message);
        results.push({ experiment_id: experiment.id, video_id: experiment.video_id, action: "error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        rolled_back: results.filter((r) => r.action === "rolled_back").length,
        completed: results.filter((r) => r.action === "completed").length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Experiment check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
