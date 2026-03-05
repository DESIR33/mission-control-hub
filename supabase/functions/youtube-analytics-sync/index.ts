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
    // Log granted scopes to verify yt-analytics.readonly is present
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Structured result for client
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

    const startDate = body.start_date ?? daysAgo(28);
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

    // Get access token
    let accessToken = config.access_token;
    const refreshToken = config.refresh_token;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (refreshToken && clientId && clientSecret) {
      accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);
      await supabase
        .from("workspace_integrations")
        .update({
          config: { ...config, access_token: accessToken },
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspace_id)
        .eq("integration_key", "youtube");
    } else if (!accessToken) {
      const missing = [];
      if (!refreshToken) missing.push("refresh_token");
      if (!clientId) missing.push("client_id");
      if (!clientSecret) missing.push("client_secret");
      throw new Error(`Missing OAuth credentials: ${missing.join(", ")}.`);
    }

    const ids = "channel==MINE";

    // ═══════════════════════════════════════════════════════════════
    // 1. Channel daily analytics
    // VALID metrics for channel reports with day dimension.
    // NOTE: endScreenElementClicks/Impressions/ClickRate are NOT valid
    // metric identifiers and cause 400 errors.
    // ═══════════════════════════════════════════════════════════════
    try {
      // Core metrics that are always available
      const coreChannelMetrics = [
        "views",
        "estimatedMinutesWatched",
        "averageViewDuration",
        "averageViewPercentage",
        "subscribersGained",
        "subscribersLost",
        "likes",
        "dislikes",
        "comments",
        "shares",
        "cardClicks",
        "cardImpressions",
        "cardClickRate",
        "estimatedRevenue",
        "estimatedAdRevenue",
        "estimatedRedPartnerRevenue",
        "grossRevenue",
        "cpm",
        "adImpressions",
        "monetizedPlaybacks",
        "playbackBasedCpm",
      ];

      const channelData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "day",
        metrics: coreChannelMetrics.join(","),
        sort: "day",
      });

      if (channelData.rows) {
        for (const row of channelData.rows) {
          const [
            day, views, minutesWatched, avgDuration, avgPercentage,
            subsGained, subsLost, likes, dislikes, comments, shares,
            cardClicks, cardImpressions, cardCtr,
            estRevenue, estAdRevenue, estRedRevenue, grossRevenue,
            cpmVal, adImpressions, monetizedPlaybacks, playbackCpm,
          ] = row;

          const record = {
            workspace_id,
            date: day,
            views: views || 0,
            estimated_minutes_watched: minutesWatched || 0,
            average_view_duration_seconds: Math.round(avgDuration || 0),
            average_view_percentage: avgPercentage || 0,
            subscribers_gained: subsGained || 0,
            subscribers_lost: subsLost || 0,
            net_subscribers: (subsGained || 0) - (subsLost || 0),
            likes: likes || 0,
            dislikes: dislikes || 0,
            comments: comments || 0,
            shares: shares || 0,
            impressions: 0,
            impressions_ctr: 0,
            unique_viewers: 0,
            card_clicks: cardClicks || 0,
            card_impressions: cardImpressions || 0,
            card_ctr: cardCtr || 0,
            end_screen_element_clicks: 0,
            end_screen_element_impressions: 0,
            end_screen_element_ctr: 0,
            estimated_revenue: estRevenue || 0,
            estimated_ad_revenue: estAdRevenue || 0,
            estimated_red_partner_revenue: estRedRevenue || 0,
            gross_revenue: grossRevenue || 0,
            cpm: cpmVal || 0,
            ad_impressions: adImpressions || 0,
            monetized_playbacks: monetizedPlaybacks || 0,
            playback_based_cpm: playbackCpm || 0,
            fetched_at: new Date().toISOString(),
          };

          if (syncResult.channelRowsUpserted === 0) {
            syncResult.sampleChannelRow = {
              day, views, minutesWatched, avgDuration, avgPercentage,
              estRevenue,
            };
            console.log("[YT Analytics] Sample channel row:", JSON.stringify(syncResult.sampleChannelRow));
          }

          const { error: upsertErr } = await supabase
            .from("youtube_channel_analytics")
            .upsert(record, { onConflict: "workspace_id,date" });

          if (upsertErr) {
            console.error(`[YT Analytics] Channel upsert error for ${day}:`, upsertErr.message);
            syncResult.errors.push(`Channel upsert ${day}: ${upsertErr.message}`);
          } else {
            syncResult.channelRowsUpserted++;
          }
        }
      }
      console.log(`[YT Analytics] Channel: ${syncResult.channelRowsUpserted} rows upserted`);
    } catch (e: any) {
      const msg = `Channel analytics: ${e.message}`;
      console.error(`[YT Analytics] ${msg}`);
      syncResult.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Per-video analytics (top 50 by views)
    // ═══════════════════════════════════════════════════════════════
    try {
      const videoMetrics = [
        "views",
        "estimatedMinutesWatched",
        "averageViewDuration",
        "averageViewPercentage",
        "subscribersGained",
        "subscribersLost",
        "likes",
        "dislikes",
        "comments",
        "shares",
        "cardClicks",
        "cardImpressions",
        "annotationClickThroughRate",
        "estimatedRevenue",
      ];

      const videoData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "video",
        metrics: videoMetrics.join(","),
        sort: "-views",
        maxResults: 50,
      });

      if (videoData.rows) {
        for (const row of videoData.rows) {
          const [
            videoId, views, minutesWatched, avgDuration, avgPercentage,
            subsGained, subsLost, likes, dislikes, comments, shares,
            cardClicks, cardImpressions,
            annotationCtr, estRevenue,
          ] = row;

          // Fetch video title
          let title = videoId;
          if (config.api_key) {
            try {
              const titleRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&fields=items/snippet/title&key=${config.api_key}`
              );
              const titleData = await titleRes.json();
              title = titleData.items?.[0]?.snippet?.title || videoId;
            } catch { /* fallback */ }
          }

          if (syncResult.videoRowsUpserted === 0) {
            syncResult.sampleVideoRow = {
              videoId, views, minutesWatched, avgDuration, avgPercentage,
              estRevenue,
            };
            console.log("[YT Analytics] Sample video row:", JSON.stringify(syncResult.sampleVideoRow));
          }

          const { error: upsertErr } = await supabase
            .from("youtube_video_analytics")
            .upsert(
              {
                workspace_id,
                youtube_video_id: videoId,
                title,
                date: endDate,
                views: views || 0,
                estimated_minutes_watched: minutesWatched || 0,
                average_view_duration_seconds: Math.round(avgDuration || 0),
                average_view_percentage: avgPercentage || 0,
                subscribers_gained: subsGained || 0,
                subscribers_lost: subsLost || 0,
                likes: likes || 0,
                dislikes: dislikes || 0,
                comments: comments || 0,
                shares: shares || 0,
                impressions: 0,
                impressions_ctr: 0,
                card_clicks: cardClicks || 0,
                card_impressions: cardImpressions || 0,
                end_screen_element_clicks: 0,
                end_screen_element_impressions: 0,
                annotation_click_through_rate: annotationCtr || 0,
                estimated_revenue: estRevenue || 0,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id,youtube_video_id,date" }
            );

          if (upsertErr) {
            console.error(`[YT Analytics] Video upsert error for ${videoId}:`, upsertErr.message);
            syncResult.errors.push(`Video upsert ${videoId}: ${upsertErr.message}`);
          } else {
            syncResult.videoRowsUpserted++;
          }
        }
      }
      console.log(`[YT Analytics] Videos: ${syncResult.videoRowsUpserted} rows upserted`);
    } catch (e: any) {
      const msg = `Video analytics: ${e.message}`;
      console.error(`[YT Analytics] ${msg}`);
      syncResult.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. Demographics
    // ═══════════════════════════════════════════════════════════════
    try {
      const demoData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate, endDate,
        dimensions: "ageGroup,gender",
        metrics: "viewerPercentage",
      });

      if (demoData.rows) {
        for (const row of demoData.rows) {
          const [ageGroup, gender, viewerPercentage] = row;
          const { error } = await supabase.from("youtube_demographics").upsert(
            {
              workspace_id, date: endDate,
              age_group: ageGroup, gender,
              viewer_percentage: viewerPercentage || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,age_group,gender" }
          );
          if (!error) syncResult.demographicsUpserted++;
        }
      }
    } catch (e: any) {
      syncResult.errors.push(`Demographics: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Traffic sources
    // ═══════════════════════════════════════════════════════════════
    try {
      const trafficData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate, endDate,
        dimensions: "insightTrafficSourceType",
        metrics: "views,estimatedMinutesWatched",
        sort: "-views",
      });

      if (trafficData.rows) {
        for (const row of trafficData.rows) {
          const [sourceType, views, minutesWatched] = row;
          const { error } = await supabase.from("youtube_traffic_sources").upsert(
            {
              workspace_id, date: endDate,
              source_type: sourceType,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,source_type" }
          );
          if (!error) syncResult.trafficSourcesUpserted++;
        }
      }
    } catch (e: any) {
      syncResult.errors.push(`Traffic sources: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. Geography
    // ═══════════════════════════════════════════════════════════════
    try {
      const geoData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate, endDate,
        dimensions: "country",
        metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
        sort: "-views",
        maxResults: 50,
      });

      if (geoData.rows) {
        for (const row of geoData.rows) {
          const [country, views, minutesWatched, avgDuration, subsGained] = row;
          const { error } = await supabase.from("youtube_geography").upsert(
            {
              workspace_id, date: endDate, country,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              average_view_duration_seconds: Math.round(avgDuration || 0),
              subscribers_gained: subsGained || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,country" }
          );
          if (!error) syncResult.geographyUpserted++;
        }
      }
    } catch (e: any) {
      syncResult.errors.push(`Geography: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. Device types
    // ═══════════════════════════════════════════════════════════════
    try {
      const deviceData = await fetchYouTubeAnalytics(accessToken, {
        ids, startDate, endDate,
        dimensions: "deviceType",
        metrics: "views,estimatedMinutesWatched",
        sort: "-views",
      });

      if (deviceData.rows) {
        for (const row of deviceData.rows) {
          const [deviceType, views, minutesWatched] = row;
          const { error } = await supabase.from("youtube_device_types").upsert(
            {
              workspace_id, date: endDate,
              device_type: deviceType,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,device_type" }
          );
          if (!error) syncResult.devicesUpserted++;
        }
      }
    } catch (e: any) {
      syncResult.errors.push(`Device types: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. Per-video audience retention (top 10)
    // ═══════════════════════════════════════════════════════════════
    try {
      const { data: topVideos } = await supabase
        .from("youtube_video_analytics")
        .select("youtube_video_id")
        .eq("workspace_id", workspace_id)
        .order("views", { ascending: false })
        .limit(10);

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
              fetched_at: new Date().toISOString(),
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
