import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get last 14 days of video analytics for rolling averages
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: analytics } = await supabase
      .from("youtube_video_analytics")
      .select("youtube_video_id, title, date, views, impressions_ctr, subscribers_gained, estimated_revenue")
      .eq("workspace_id", workspace_id)
      .gte("date", fourteenDaysAgo)
      .order("date", { ascending: false });

    if (!analytics?.length) {
      return new Response(
        JSON.stringify({ success: true, alerts: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by video and compute averages
    const videoStats = new Map<string, {
      title: string;
      views: number[];
      ctr: number[];
      subs: number[];
      revenue: number[];
      latestViews: number;
      latestCtr: number;
      latestSubs: number;
      latestRevenue: number;
    }>();

    for (const row of analytics) {
      const vid = row.youtube_video_id;
      if (!videoStats.has(vid)) {
        videoStats.set(vid, {
          title: row.title || vid,
          views: [],
          ctr: [],
          subs: [],
          revenue: [],
          latestViews: 0,
          latestCtr: 0,
          latestSubs: 0,
          latestRevenue: 0,
        });
      }
      const entry = videoStats.get(vid)!;
      entry.views.push(row.views || 0);
      entry.ctr.push(row.impressions_ctr || 0);
      entry.subs.push(row.subscribers_gained || 0);
      entry.revenue.push(Number(row.estimated_revenue) || 0);

      if (row.date >= oneDayAgo) {
        entry.latestViews = Math.max(entry.latestViews, row.views || 0);
        entry.latestCtr = row.impressions_ctr || 0;
        entry.latestSubs = Math.max(entry.latestSubs, row.subscribers_gained || 0);
        entry.latestRevenue = Math.max(entry.latestRevenue, Number(row.estimated_revenue) || 0);
      }
    }

    const alerts: Array<{
      alert_type: string;
      severity: string;
      title: string;
      description: string;
      youtube_video_id: string;
      metric_name: string;
      metric_value: number;
      threshold_value: number;
    }> = [];

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    for (const [videoId, stats] of videoStats) {
      const avgViews = avg(stats.views);
      const avgCtr = avg(stats.ctr);
      const avgSubs = avg(stats.subs);

      // Views spike: latest > 2x average
      if (stats.latestViews > avgViews * 2 && avgViews > 10) {
        alerts.push({
          alert_type: "views_spike",
          severity: "celebration",
          title: `Views spike on "${stats.title}"`,
          description: `Getting ${stats.latestViews.toLocaleString()} views vs ${Math.round(avgViews).toLocaleString()} avg — this video is taking off!`,
          youtube_video_id: videoId,
          metric_name: "views",
          metric_value: stats.latestViews,
          threshold_value: avgViews * 2,
        });
      }

      // CTR drop: latest < 80% of average
      if (stats.latestCtr < avgCtr * 0.8 && avgCtr > 0.01 && stats.latestCtr > 0) {
        alerts.push({
          alert_type: "ctr_drop",
          severity: "warning",
          title: `CTR drop on "${stats.title}"`,
          description: `CTR fell to ${(stats.latestCtr * 100).toFixed(1)}% vs ${(avgCtr * 100).toFixed(1)}% avg — consider testing a new thumbnail.`,
          youtube_video_id: videoId,
          metric_name: "impressions_ctr",
          metric_value: stats.latestCtr,
          threshold_value: avgCtr * 0.8,
        });
      }

      // Subscriber surge: latest > 3x average
      if (stats.latestSubs > avgSubs * 3 && avgSubs > 1) {
        alerts.push({
          alert_type: "sub_surge",
          severity: "celebration",
          title: `Subscriber surge from "${stats.title}"`,
          description: `Gained ${stats.latestSubs} subscribers vs ${Math.round(avgSubs)} avg — this content resonates!`,
          youtube_video_id: videoId,
          metric_name: "subscribers_gained",
          metric_value: stats.latestSubs,
          threshold_value: avgSubs * 3,
        });
      }
    }

    // Check for revenue milestones
    const totalRecentRevenue = analytics
      .filter((r) => r.date >= oneDayAgo)
      .reduce((s, r) => s + (Number(r.estimated_revenue) || 0), 0);

    const milestones = [100, 500, 1000, 5000];
    for (const milestone of milestones) {
      if (totalRecentRevenue >= milestone) {
        // Check if we already alerted this milestone recently
        const { count } = await supabase
          .from("youtube_alerts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace_id)
          .eq("alert_type", "revenue_milestone")
          .eq("threshold_value", milestone)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (!count || count === 0) {
          alerts.push({
            alert_type: "revenue_milestone",
            severity: "celebration",
            title: `Revenue milestone: $${milestone}+`,
            description: `Your daily YouTube revenue hit $${totalRecentRevenue.toFixed(2)} — you crossed the $${milestone} milestone!`,
            youtube_video_id: "",
            metric_name: "estimated_revenue",
            metric_value: totalRecentRevenue,
            threshold_value: milestone,
          });
          break; // Only alert the highest milestone
        }
      }
    }

    // Insert alerts (avoid duplicates from last 24h)
    let insertedCount = 0;
    for (const alert of alerts) {
      const { count: existing } = await supabase
        .from("youtube_alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .eq("alert_type", alert.alert_type)
        .eq("youtube_video_id", alert.youtube_video_id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!existing || existing === 0) {
        await supabase.from("youtube_alerts").insert({
          workspace_id,
          ...alert,
        });

        // Also create a notification
        await supabase.from("notifications").insert({
          workspace_id,
          type: alert.severity === "warning" ? "warning" : "success",
          title: alert.title,
          body: alert.description,
          entity_type: "youtube_alert",
          entity_id: alert.youtube_video_id || null,
        });

        insertedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
