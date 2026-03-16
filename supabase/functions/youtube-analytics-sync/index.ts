import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyticsRequest {
  workspace_id: string;
  start_date?: string;
  end_date?: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function fetchYouTubeAnalytics(
  accessToken: string,
  params: {
    ids: string;
    startDate: string;
    endDate: string;
    metrics: string;
    dimensions?: string;
    filters?: string;
    sort?: string;
    maxResults?: number;
  }
): Promise<any> {
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", params.ids);
  url.searchParams.set("startDate", params.startDate);
  url.searchParams.set("endDate", params.endDate);
  url.searchParams.set("metrics", params.metrics);
  if (params.dimensions) url.searchParams.set("dimensions", params.dimensions);
  if (params.filters) url.searchParams.set("filters", params.filters);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.maxResults) url.searchParams.set("maxResults", String(params.maxResults));

  console.log(`[YT Analytics] Fetching: dims=${params.dimensions || "none"}, metrics=${params.metrics}, range=${params.startDate}..${params.endDate}`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[YT Analytics] HTTP ${res.status}: ${errBody}`);
    throw new Error(`YouTube Analytics API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  console.log(`[YT Analytics] Got ${data.rows?.length ?? 0} rows`);
  return data;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    if (data.scope) {
      console.log(`[YT Analytics] Token scopes: ${data.scope}`);
    }
    return data.access_token;
  }

  const errBody = await res.text();
  console.error(`[YT Analytics] Token refresh failed (${res.status}): ${errBody}`);
  throw new Error(
    "OAuth token refresh failed. Make sure the refresh_token was generated " +
    "using the SAME client_id and client_secret you entered in Integrations."
  );
}

/** Batch upsert helper — chunks array and upserts in batches of `size`. */
async function batchUpsert(
  supabase: any,
  table: string,
  rows: any[],
  onConflict: string,
  size = 200
): Promise<{ upserted: number; errors: string[] }> {
  let upserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      errors.push(`${table} batch ${i}: ${error.message}`);
    } else {
      upserted += chunk.length;
    }
  }
  return { upserted, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const syncResult: {
    ok: boolean;
    channelRowsUpserted: number;
    videoRowsUpserted: number;
    demographicsUpserted: number;
    trafficSourcesUpserted: number;
    geographyUpserted: number;
    devicesUpserted: number;
    retentionVideos: number;
    errors: string[];
    sampleChannelRow: any;
    sampleVideoRow: any;
    period: { start_date: string; end_date: string } | null;
  } = {
    ok: false,
    channelRowsUpserted: 0,
    videoRowsUpserted: 0,
    demographicsUpserted: 0,
    trafficSourcesUpserted: 0,
    geographyUpserted: 0,
    devicesUpserted: 0,
    retentionVideos: 0,
    errors: [],
    sampleChannelRow: null,
    sampleVideoRow: null,
    period: null,
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: AnalyticsRequest = await req.json();
    const { workspace_id } = body;
    if (!workspace_id) throw new Error("Missing workspace_id");

    const startDate = body.start_date ?? daysAgo(90);
    const endDate = body.end_date ?? daysAgo(1);
    syncResult.period = { start_date: startDate, end_date: endDate };

    // Get YouTube integration config
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (intError || !integration?.config) {
      throw new Error("YouTube integration not configured. Go to Integrations to set up your YouTube connection.");
    }

    const config = integration.config as Record<string, any>;

    let accessToken = config.access_token;
    const refreshToken = config.refresh_token;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;
    const lastTokenRefresh = config.token_refreshed_at ? new Date(config.token_refreshed_at).getTime() : 0;
    const tokenAge = Date.now() - lastTokenRefresh;
    const TOKEN_REUSE_WINDOW = 5 * 60 * 1000; // 5 minutes

    if (refreshToken && clientId && clientSecret) {
      // Skip refresh if token was refreshed within the last 5 minutes (dedup with youtube-sync)
      if (tokenAge > TOKEN_REUSE_WINDOW || !accessToken) {
        console.log(`[YT Analytics] Token age: ${Math.round(tokenAge / 1000)}s — refreshing`);
        accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);
        await supabase
          .from("workspace_integrations")
          .update({
            config: { ...config, access_token: accessToken, token_refreshed_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspace_id)
          .eq("integration_key", "youtube");
      } else {
        console.log(`[YT Analytics] Token age: ${Math.round(tokenAge / 1000)}s — reusing cached token`);
      }
    } else if (!accessToken) {
      const missing = [];
      if (!refreshToken) missing.push("refresh_token");
      if (!clientId) missing.push("client_id");
      if (!clientSecret) missing.push("client_secret");
      throw new Error(`Missing OAuth credentials: ${missing.join(", ")}.`);
    }

    const ids = "channel==MINE";
    const now = new Date().toISOString();

    // ═══════════════════════════════════════════════════════════════
    // 1. Channel daily analytics — BATCHED
    // ═══════════════════════════════════════════════════════════════
    try {
      const coreChannelMetrics = [
        "views", "estimatedMinutesWatched", "averageViewDuration",
        "averageViewPercentage", "subscribersGained", "subscribersLost",
        "likes", "dislikes", "comments", "shares",
        "cardClicks", "cardImpressions", "cardClickRate",
        "estimatedRevenue", "estimatedAdRevenue", "estimatedRedPartnerRevenue",
        "grossRevenue", "cpm", "adImpressions", "monetizedPlaybacks", "playbackBasedCpm",
      ];

      const channelData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate, endDate,
        dimensions: "day",
        metrics: coreChannelMetrics.join(","),
        sort: "day",
      });

      if (channelData.rows?.length) {
        const records = channelData.rows.map((row: any) => {
          const [
            day, views, minutesWatched, avgDuration, avgPercentage,
            subsGained, subsLost, likes, dislikes, comments, shares,
            cardClicks, cardImpressions, cardCtr,
            estRevenue, estAdRevenue, estRedRevenue, grossRevenue,
            cpmVal, adImpressions, monetizedPlaybacks, playbackCpm,
          ] = row;
          return {
            workspace_id, date: day,
            views: views || 0, estimated_minutes_watched: minutesWatched || 0,
            average_view_duration_seconds: Math.round(avgDuration || 0),
            average_view_percentage: avgPercentage || 0,
            subscribers_gained: subsGained || 0, subscribers_lost: subsLost || 0,
            net_subscribers: (subsGained || 0) - (subsLost || 0),
            likes: likes || 0, dislikes: dislikes || 0, comments: comments || 0,
            shares: shares || 0, impressions: 0, impressions_ctr: 0, unique_viewers: 0,
            card_clicks: cardClicks || 0, card_impressions: cardImpressions || 0, card_ctr: cardCtr || 0,
            end_screen_element_clicks: 0, end_screen_element_impressions: 0, end_screen_element_ctr: 0,
            estimated_revenue: estRevenue || 0, estimated_ad_revenue: estAdRevenue || 0,
            estimated_red_partner_revenue: estRedRevenue || 0, gross_revenue: grossRevenue || 0,
            cpm: cpmVal || 0, ad_impressions: adImpressions || 0,
            monetized_playbacks: monetizedPlaybacks || 0, playback_based_cpm: playbackCpm || 0,
            fetched_at: now,
          };
        });

        syncResult.sampleChannelRow = {
          day: records[0].date, views: records[0].views,
          minutesWatched: records[0].estimated_minutes_watched,
          avgDuration: records[0].average_view_duration_seconds,
          avgPercentage: records[0].average_view_percentage,
          estRevenue: records[0].estimated_revenue,
        };

        const res = await batchUpsert(supabase, "youtube_channel_analytics", records, "workspace_id,date");
        syncResult.channelRowsUpserted = res.upserted;
        syncResult.errors.push(...res.errors);
      }
      console.log(`[YT Analytics] Channel: ${syncResult.channelRowsUpserted} rows upserted`);
    } catch (e: any) {
      syncResult.errors.push(`Channel analytics: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Per-video analytics (top 200, lifetime) — BATCHED
    // ═══════════════════════════════════════════════════════════════
    try {
      const videoMetrics = [
        "views", "estimatedMinutesWatched", "averageViewDuration",
        "averageViewPercentage", "subscribersGained", "subscribersLost",
        "likes", "dislikes", "comments", "shares",
        "cardClicks", "cardImpressions", "annotationClickThroughRate", "estimatedRevenue",
      ];

      const videoData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate: "2005-01-01", endDate,
        dimensions: "video",
        metrics: videoMetrics.join(","),
        sort: "-views", maxResults: 200,
      });

      if (videoData.rows?.length) {
        // Bulk-fetch existing titles from DB in one query (no per-row queries)
        const videoIds = videoData.rows.map((r: any) => r[0]);
        const { data: existingStats } = await supabase
          .from("youtube_video_stats")
          .select("youtube_video_id, title")
          .eq("workspace_id", workspace_id)
          .in("youtube_video_id", videoIds);
        const titleMap = new Map<string, string>();
        for (const s of (existingStats || [])) {
          if (s.title) titleMap.set(s.youtube_video_id, s.title);
        }

        // Also check existing analytics titles
        const { data: existingAnalytics } = await supabase
          .from("youtube_video_analytics")
          .select("youtube_video_id, title")
          .eq("workspace_id", workspace_id)
          .in("youtube_video_id", videoIds);
        for (const s of (existingAnalytics || [])) {
          if (s.title && !titleMap.has(s.youtube_video_id)) {
            titleMap.set(s.youtube_video_id, s.title);
          }
        }

        const records = videoData.rows.map((row: any) => {
          const [
            videoId, views, minutesWatched, avgDuration, avgPercentage,
            subsGained, subsLost, likes, dislikes, comments, shares,
            cardClicks, cardImpressions, annotationCtr, estRevenue,
          ] = row;
          return {
            workspace_id, youtube_video_id: videoId,
            title: titleMap.get(videoId) || "Untitled Video",
            date: endDate,
            views: views || 0, estimated_minutes_watched: minutesWatched || 0,
            average_view_duration_seconds: Math.round(avgDuration || 0),
            average_view_percentage: avgPercentage || 0,
            subscribers_gained: subsGained || 0, subscribers_lost: subsLost || 0,
            likes: likes || 0, dislikes: dislikes || 0, comments: comments || 0,
            shares: shares || 0, impressions: 0, impressions_ctr: 0,
            card_clicks: cardClicks || 0, card_impressions: cardImpressions || 0,
            end_screen_element_clicks: 0, end_screen_element_impressions: 0,
            annotation_click_through_rate: annotationCtr || 0,
            estimated_revenue: estRevenue || 0,
            fetched_at: now,
          };
        });

        syncResult.sampleVideoRow = {
          videoId: records[0].youtube_video_id, views: records[0].views,
          minutesWatched: records[0].estimated_minutes_watched,
          avgDuration: records[0].average_view_duration_seconds,
          avgPercentage: records[0].average_view_percentage,
          estRevenue: records[0].estimated_revenue,
        };

        const res = await batchUpsert(supabase, "youtube_video_analytics", records, "workspace_id,youtube_video_id");
        syncResult.videoRowsUpserted = res.upserted;
        syncResult.errors.push(...res.errors);
      }
      console.log(`[YT Analytics] Videos: ${syncResult.videoRowsUpserted} rows upserted`);
    } catch (e: any) {
      syncResult.errors.push(`Video analytics: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3-6. Demographics, Traffic, Geography, Devices — PARALLEL
    // ═══════════════════════════════════════════════════════════════
    const parallelResults = await Promise.allSettled([
      // 3. Demographics
      (async () => {
        const demoData = await fetchYouTubeAnalytics(accessToken, {
          ids, startDate, endDate,
          dimensions: "ageGroup,gender",
          metrics: "viewerPercentage",
        });
        if (demoData.rows?.length) {
          const records = demoData.rows.map((row: any) => ({
            workspace_id, date: endDate,
            age_group: row[0], gender: row[1],
            viewer_percentage: row[2] || 0,
            fetched_at: now,
          }));
          return { section: "demographics", ...(await batchUpsert(supabase, "youtube_demographics", records, "workspace_id,date,age_group,gender")) };
        }
        return { section: "demographics", upserted: 0, errors: [] };
      })(),
      // 4. Traffic sources
      (async () => {
        const trafficData = await fetchYouTubeAnalytics(accessToken, {
          ids, startDate, endDate,
          dimensions: "insightTrafficSourceType",
          metrics: "views,estimatedMinutesWatched",
          sort: "-views",
        });
        if (trafficData.rows?.length) {
          const records = trafficData.rows.map((row: any) => ({
            workspace_id, date: endDate,
            source_type: row[0], views: row[1] || 0,
            estimated_minutes_watched: row[2] || 0,
            fetched_at: now,
          }));
          return { section: "trafficSources", ...(await batchUpsert(supabase, "youtube_traffic_sources", records, "workspace_id,date,source_type")) };
        }
        return { section: "trafficSources", upserted: 0, errors: [] };
      })(),
      // 5. Geography
      (async () => {
        const geoData = await fetchYouTubeAnalytics(accessToken, {
          ids, startDate, endDate,
          dimensions: "country",
          metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
          sort: "-views", maxResults: 50,
        });
        if (geoData.rows?.length) {
          const records = geoData.rows.map((row: any) => ({
            workspace_id, date: endDate, country: row[0],
            views: row[1] || 0, estimated_minutes_watched: row[2] || 0,
            average_view_duration_seconds: Math.round(row[3] || 0),
            subscribers_gained: row[4] || 0, fetched_at: now,
          }));
          return { section: "geography", ...(await batchUpsert(supabase, "youtube_geography", records, "workspace_id,date,country")) };
        }
        return { section: "geography", upserted: 0, errors: [] };
      })(),
      // 6. Device types
      (async () => {
        const deviceData = await fetchYouTubeAnalytics(accessToken, {
          ids, startDate, endDate,
          dimensions: "deviceType",
          metrics: "views,estimatedMinutesWatched",
          sort: "-views",
        });
        if (deviceData.rows?.length) {
          const records = deviceData.rows.map((row: any) => ({
            workspace_id, date: endDate,
            device_type: row[0], views: row[1] || 0,
            estimated_minutes_watched: row[2] || 0,
            fetched_at: now,
          }));
          return { section: "devices", ...(await batchUpsert(supabase, "youtube_device_types", records, "workspace_id,date,device_type")) };
        }
        return { section: "devices", upserted: 0, errors: [] };
      })(),
    ]);

    // Collect results from parallel executions
    for (const result of parallelResults) {
      if (result.status === "fulfilled") {
        const r = result.value;
        if (r.section === "demographics") syncResult.demographicsUpserted = r.upserted;
        else if (r.section === "trafficSources") syncResult.trafficSourcesUpserted = r.upserted;
        else if (r.section === "geography") syncResult.geographyUpserted = r.upserted;
        else if (r.section === "devices") syncResult.devicesUpserted = r.upserted;
        syncResult.errors.push(...r.errors);
      } else {
        syncResult.errors.push(`Parallel section: ${result.reason?.message || String(result.reason)}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. Per-video audience retention (top 10) — BATCHED per video
    // ═══════════════════════════════════════════════════════════════
    try {
      const { data: topVideos } = await supabase
        .from("youtube_video_analytics")
        .select("youtube_video_id")
        .eq("workspace_id", workspace_id)
        .order("views", { ascending: false })
        .limit(5);

      for (const v of (topVideos ?? []) as any[]) {
        try {
          const retentionData = await fetchYouTubeAnalytics(accessToken, {
            ids, startDate, endDate,
            dimensions: "elapsedVideoTimeRatio",
            metrics: "audienceWatchRatio",
            filters: `video==${v.youtube_video_id}`,
          });

          if (retentionData.rows?.length > 0) {
            await supabase
              .from("youtube_video_retention")
              .delete()
              .eq("workspace_id", workspace_id)
              .eq("youtube_video_id", v.youtube_video_id);

            const retentionRows = retentionData.rows.map((row: any) => ({
              workspace_id,
              youtube_video_id: v.youtube_video_id,
              elapsed_ratio: row[0] || 0,
              audience_retention: row[1] || 0,
              fetched_at: now,
            }));

            await supabase.from("youtube_video_retention").insert(retentionRows);
            syncResult.retentionVideos++;
          }
        } catch (retErr: any) {
          console.error(`[YT Analytics] Retention error for ${v.youtube_video_id}: ${retErr.message}`);
        }
      }
    } catch (e: any) {
      syncResult.errors.push(`Retention: ${e.message}`);
    }

    syncResult.ok = syncResult.errors.length === 0;
    console.log("[YT Analytics] Sync complete:", JSON.stringify(syncResult));

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    syncResult.errors.push(error.message || String(error));
    console.error("[YT Analytics] Fatal error:", error.message);

    return new Response(JSON.stringify(syncResult), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
