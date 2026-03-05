import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * YouTube Analytics API sync edge function.
 *
 * Fetches detailed analytics from the YouTube Analytics and Reporting API:
 * - Channel daily metrics (watch time, impressions, CTR, revenue, etc.)
 * - Per-video analytics
 * - Demographics (age group + gender)
 * - Traffic sources
 * - Geography (country-level)
 * - Device types
 *
 * Requires OAuth2 access token stored in workspace_integrations config.
 */

interface AnalyticsRequest {
  workspace_id: string;
  start_date?: string; // YYYY-MM-DD, defaults to 28 days ago
  end_date?: string; // YYYY-MM-DD, defaults to yesterday
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
  const url = new URL(
    "https://youtubeanalytics.googleapis.com/v2/reports"
  );
  url.searchParams.set("ids", params.ids);
  url.searchParams.set("startDate", params.startDate);
  url.searchParams.set("endDate", params.endDate);
  url.searchParams.set("metrics", params.metrics);
  if (params.dimensions) url.searchParams.set("dimensions", params.dimensions);
  if (params.filters) url.searchParams.set("filters", params.filters);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.maxResults)
    url.searchParams.set("maxResults", String(params.maxResults));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `YouTube Analytics API error (${res.status}): ${errBody}`
    );
  }

  return res.json();
}

// Google OAuth Playground uses its own credentials — if the user generated
// their refresh token there, we must use the Playground's client pair.
const PLAYGROUND_CLIENT_ID =
  "407408718192.apps.googleusercontent.com";
const PLAYGROUND_CLIENT_SECRET = "************"; // not actually secret

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Try with user-provided credentials first
  const pairs = [
    { id: clientId, secret: clientSecret },
  ];

  for (const { id, secret } of pairs) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: id,
        client_secret: secret,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }

    const errBody = await res.text();
    console.error(
      `Token refresh with client ${id.substring(0, 12)}… failed (${res.status}): ${errBody}`
    );
  }

  throw new Error(
    "OAuth token refresh failed. Make sure the refresh_token was generated " +
    "using the SAME client_id and client_secret you entered in Integrations. " +
    "If you used Google's OAuth Playground, you must use its built-in credentials " +
    "or regenerate the token with your own OAuth app."
  );
}

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

    const body: AnalyticsRequest = await req.json();
    const { workspace_id } = body;
    if (!workspace_id) throw new Error("Missing workspace_id");

    const startDate = body.start_date ?? daysAgo(28);
    const endDate = body.end_date ?? daysAgo(1);

    // Get YouTube integration config (needs OAuth tokens for Analytics API)
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (intError || !integration?.config) {
      throw new Error(
        "YouTube integration not configured. Go to Integrations to set up your YouTube connection."
      );
    }

    const config = integration.config as Record<string, any>;

    // Get access token - either from stored OAuth or refresh it
    let accessToken = config.access_token;
    const refreshToken = config.refresh_token;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (refreshToken && clientId && clientSecret) {
      try {
        accessToken = await refreshAccessToken(
          refreshToken,
          clientId,
          clientSecret
        );
        // Store updated access token
        await supabase
          .from("workspace_integrations")
          .update({
            config: { ...config, access_token: accessToken },
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspace_id)
          .eq("integration_key", "youtube");
      } catch (refreshErr: unknown) {
        const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
        throw new Error(msg);
      }
    } else if (!accessToken) {
      const missing = [];
      if (!refreshToken) missing.push("refresh_token");
      if (!clientId) missing.push("client_id");
      if (!clientSecret) missing.push("client_secret");
      throw new Error(
        `Missing OAuth credentials: ${missing.join(", ")}. ` +
        "Add them in Integrations → YouTube to use the Analytics API."
      );
    }

    const channelId = config.channel_id;
    const ids = "channel==MINE";

    const results: Record<string, number> = {
      channel_days: 0,
      video_rows: 0,
      demographics: 0,
      traffic_sources: 0,
      geography: 0,
      devices: 0,
      retention_videos: 0,
    };

    // 1. Channel daily analytics
    try {
      const channelData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "day",
        metrics: [
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
          "impressions",
          "impressionsCtr",
          "uniqueViewers",
          "cardClicks",
          "cardImpressions",
          "cardClickRate",
          "endScreenElementClicks",
          "endScreenElementImpressions",
          "endScreenElementClickRate",
          "estimatedRevenue",
          "estimatedAdRevenue",
          "estimatedRedPartnerRevenue",
          "grossRevenue",
          "cpm",
          "adImpressions",
          "monetizedPlaybacks",
          "playbackBasedCpm",
        ].join(","),
        sort: "day",
      });

      if (channelData.rows) {
        for (const row of channelData.rows) {
          const [
            day,
            views,
            minutesWatched,
            avgDuration,
            avgPercentage,
            subsGained,
            subsLost,
            likes,
            dislikes,
            comments,
            shares,
            impressions,
            impressionsCtr,
            uniqueViewers,
            cardClicks,
            cardImpressions,
            cardCtr,
            endScreenClicks,
            endScreenImpressions,
            endScreenCtr,
            estRevenue,
            estAdRevenue,
            estRedRevenue,
            grossRevenue,
            cpm,
            adImpressions,
            monetizedPlaybacks,
            playbackCpm,
          ] = row;

          await supabase.from("youtube_channel_analytics").upsert(
            {
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
              impressions: impressions || 0,
              impressions_ctr: impressionsCtr || 0,
              unique_viewers: uniqueViewers || 0,
              card_clicks: cardClicks || 0,
              card_impressions: cardImpressions || 0,
              card_ctr: cardCtr || 0,
              end_screen_element_clicks: endScreenClicks || 0,
              end_screen_element_impressions: endScreenImpressions || 0,
              end_screen_element_ctr: endScreenCtr || 0,
              estimated_revenue: estRevenue || 0,
              estimated_ad_revenue: estAdRevenue || 0,
              estimated_red_partner_revenue: estRedRevenue || 0,
              gross_revenue: grossRevenue || 0,
              cpm: cpm || 0,
              ad_impressions: adImpressions || 0,
              monetized_playbacks: monetizedPlaybacks || 0,
              playback_based_cpm: playbackCpm || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date" }
          );
          results.channel_days++;
        }
      }
    } catch (e) {
      console.error("Channel analytics fetch error:", e);
    }

    // 2. Per-video analytics (top 50 by views)
    try {
      const videoData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "video",
        metrics: [
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
          "impressions",
          "impressionsCtr",
          "cardClicks",
          "cardImpressions",
          "endScreenElementClicks",
          "endScreenElementImpressions",
          "annotationClickThroughRate",
          "estimatedRevenue",
        ].join(","),
        sort: "-views",
        maxResults: 50,
      });

      if (videoData.rows) {
        for (const row of videoData.rows) {
          const [
            videoId,
            views,
            minutesWatched,
            avgDuration,
            avgPercentage,
            subsGained,
            subsLost,
            likes,
            dislikes,
            comments,
            shares,
            impressions,
            impressionsCtr,
            cardClicks,
            cardImpressions,
            endScreenClicks,
            endScreenImpressions,
            annotationCtr,
            estRevenue,
          ] = row;

          // Fetch video title from Data API if needed
          let title = videoId;
          if (config.api_key) {
            try {
              const titleRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&fields=items/snippet/title&key=${config.api_key}`
              );
              const titleData = await titleRes.json();
              title = titleData.items?.[0]?.snippet?.title || videoId;
            } catch {
              // Use videoId as fallback
            }
          }

          await supabase.from("youtube_video_analytics").upsert(
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
              impressions: impressions || 0,
              impressions_ctr: impressionsCtr || 0,
              card_clicks: cardClicks || 0,
              card_impressions: cardImpressions || 0,
              end_screen_element_clicks: endScreenClicks || 0,
              end_screen_element_impressions: endScreenImpressions || 0,
              annotation_click_through_rate: annotationCtr || 0,
              estimated_revenue: estRevenue || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,youtube_video_id,date" }
          );
          results.video_rows++;
        }
      }
    } catch (e) {
      console.error("Video analytics fetch error:", e);
    }

    // 3. Demographics (age group + gender)
    try {
      const demoData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "ageGroup,gender",
        metrics: "viewerPercentage",
      });

      if (demoData.rows) {
        for (const row of demoData.rows) {
          const [ageGroup, gender, viewerPercentage] = row;
          await supabase.from("youtube_demographics").upsert(
            {
              workspace_id,
              date: endDate,
              age_group: ageGroup,
              gender,
              viewer_percentage: viewerPercentage || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,age_group,gender" }
          );
          results.demographics++;
        }
      }
    } catch (e) {
      console.error("Demographics fetch error:", e);
    }

    // 4. Traffic sources
    try {
      const trafficData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "insightTrafficSourceType",
        metrics: "views,estimatedMinutesWatched",
        sort: "-views",
      });

      if (trafficData.rows) {
        for (const row of trafficData.rows) {
          const [sourceType, views, minutesWatched] = row;
          await supabase.from("youtube_traffic_sources").upsert(
            {
              workspace_id,
              date: endDate,
              source_type: sourceType,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,source_type" }
          );
          results.traffic_sources++;
        }
      }
    } catch (e) {
      console.error("Traffic sources fetch error:", e);
    }

    // 5. Geography (country-level)
    try {
      const geoData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "country",
        metrics:
          "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
        sort: "-views",
        maxResults: 50,
      });

      if (geoData.rows) {
        for (const row of geoData.rows) {
          const [country, views, minutesWatched, avgDuration, subsGained] = row;
          await supabase.from("youtube_geography").upsert(
            {
              workspace_id,
              date: endDate,
              country,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              average_view_duration_seconds: Math.round(avgDuration || 0),
              subscribers_gained: subsGained || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,country" }
          );
          results.geography++;
        }
      }
    } catch (e) {
      console.error("Geography fetch error:", e);
    }

    // 6. Device types
    try {
      const deviceData = await fetchYouTubeAnalytics(accessToken, {
        ids,
        startDate,
        endDate,
        dimensions: "deviceType",
        metrics: "views,estimatedMinutesWatched",
        sort: "-views",
      });

      if (deviceData.rows) {
        for (const row of deviceData.rows) {
          const [deviceType, views, minutesWatched] = row;
          await supabase.from("youtube_device_types").upsert(
            {
              workspace_id,
              date: endDate,
              device_type: deviceType,
              views: views || 0,
              estimated_minutes_watched: minutesWatched || 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,date,device_type" }
          );
          results.devices++;
        }
      }
    } catch (e) {
      console.error("Device types fetch error:", e);
    }

    // 7. Per-video audience retention (top 10 videos by views)
    try {
      // Get top video IDs from the video analytics we just synced
      const { data: topVideos } = await supabase
        .from("youtube_video_analytics")
        .select("youtube_video_id")
        .eq("workspace_id", workspace_id)
        .order("views", { ascending: false })
        .limit(10);

      const videoIds = (topVideos ?? []).map((v: any) => v.youtube_video_id);

      for (const videoId of videoIds) {
        try {
          const retentionData = await fetchYouTubeAnalytics(accessToken, {
            ids,
            startDate,
            endDate,
            dimensions: "elapsedVideoTimeRatio",
            metrics: "audienceWatchRatio",
            filters: `video==${videoId}`,
          });

          if (retentionData.rows && retentionData.rows.length > 0) {
            // Delete old retention data for this video, then insert fresh
            await supabase
              .from("youtube_video_retention")
              .delete()
              .eq("workspace_id", workspace_id)
              .eq("youtube_video_id", videoId);

            const retentionRows = retentionData.rows.map((row: any) => ({
              workspace_id,
              youtube_video_id: videoId,
              elapsed_ratio: row[0] || 0,
              audience_retention: row[1] || 0,
              fetched_at: new Date().toISOString(),
            }));

            if (retentionRows.length > 0) {
              await supabase
                .from("youtube_video_retention")
                .insert(retentionRows);
              results.retention_videos++;
            }
          }
        } catch (retErr) {
          console.error(`Retention fetch error for ${videoId}:`, retErr);
        }
      }
    } catch (e) {
      console.error("Retention sync error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        period: { start_date: startDate, end_date: endDate },
        synced: results,
        synced_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
