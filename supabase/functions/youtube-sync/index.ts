import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { workspace_id, action } = body;
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get YouTube integration config
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (intError || !integration?.config) {
      throw new Error("YouTube integration not configured. Go to Integrations to set up your API key and channel ID.");
    }

    const config = integration.config as Record<string, any>;
    const apiKey = config.api_key;
    const channelId = config.channel_id;

    if (!apiKey || !channelId) {
      throw new Error("Missing YouTube API key or channel ID in integration config.");
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST action — validate credentials without syncing
    // ═══════════════════════════════════════════════════════════════
    if (action === "test") {
      const testResult: {
        api_key_valid: boolean;
        channel_found: boolean;
        channel_name: string | null;
        oauth_configured: boolean;
        oauth_valid: boolean;
        oauth_scopes: string | null;
        errors: string[];
      } = {
        api_key_valid: false,
        channel_found: false,
        channel_name: null,
        oauth_configured: false,
        oauth_valid: false,
        oauth_scopes: null,
        errors: [],
      };

      // Test API key + channel ID
      try {
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
        const channelRes = await fetch(channelUrl);
        const channelData = await channelRes.json();

        if (channelRes.ok && channelData.items?.length) {
          testResult.api_key_valid = true;
          testResult.channel_found = true;
          testResult.channel_name = channelData.items[0].snippet?.title || null;
        } else if (channelRes.status === 403 || channelRes.status === 401) {
          testResult.errors.push(`API Key invalid or YouTube Data API not enabled: ${channelData.error?.message || "Access denied"}`);
        } else if (!channelData.items?.length) {
          testResult.api_key_valid = true;
          testResult.errors.push(`Channel ID "${channelId}" not found. Make sure it starts with "UC".`);
        }
      } catch (e: any) {
        testResult.errors.push(`API Key test failed: ${e.message}`);
      }

      // Test OAuth credentials
      const refreshToken = config.refresh_token;
      const clientId = config.client_id;
      const clientSecret = config.client_secret;

      if (refreshToken && clientId && clientSecret) {
        testResult.oauth_configured = true;
        try {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            testResult.oauth_valid = true;
            testResult.oauth_scopes = tokenData.scope || null;

            // Check for required scopes
            const scopes = tokenData.scope || "";
            const requiredScopes = [
              "https://www.googleapis.com/auth/yt-analytics.readonly",
            ];
            const monetaryScope = "https://www.googleapis.com/auth/yt-analytics-monetary.readonly";

            const missingRequired = requiredScopes.filter(s => !scopes.includes(s));
            if (missingRequired.length > 0) {
              testResult.errors.push(
                `Missing required OAuth scopes: ${missingRequired.join(", ")}. Re-generate your refresh token with these scopes.`
              );
            }
            if (!scopes.includes(monetaryScope)) {
              testResult.errors.push(
                `Optional scope missing: yt-analytics-monetary.readonly (needed for revenue data). Add this scope for full analytics.`
              );
            }
          } else {
            const errBody = await tokenRes.text();
            testResult.errors.push(`OAuth token refresh failed (${tokenRes.status}): ${errBody}`);
          }
        } catch (e: any) {
          testResult.errors.push(`OAuth test failed: ${e.message}`);
        }
      } else {
        const missing: string[] = [];
        if (!refreshToken) missing.push("refresh_token");
        if (!clientId) missing.push("client_id");
        if (!clientSecret) missing.push("client_secret");
        if (missing.length > 0 && missing.length < 3) {
          testResult.errors.push(`Partial OAuth config: missing ${missing.join(", ")}.`);
        }
      }

      return new Response(JSON.stringify({ success: true, test: testResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC action (default) — fetch and persist data
    // ═══════════════════════════════════════════════════════════════

    // Fetch channel statistics
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (!channelRes.ok || !channelData.items?.length) {
      throw new Error(`YouTube API error: ${channelData.error?.message || "Channel not found"}`);
    }

    const channel = channelData.items[0];
    const stats = channel.statistics;

    const subscriberCount = parseInt(stats.subscriberCount, 10) || 0;
    const videoCount = parseInt(stats.videoCount, 10) || 0;
    const totalViewCount = parseInt(stats.viewCount, 10) || 0;

    // Insert channel stats snapshot
    const { error: insertError } = await supabase
      .from("youtube_channel_stats")
      .insert({
        workspace_id,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        total_view_count: totalViewCount,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert channel stats:", insertError);
    }

    // Update growth goal current_value
    const { data: activeGoal } = await supabase
      .from("growth_goals")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeGoal) {
      await supabase
        .from("growth_goals")
        .update({ current_value: subscriberCount, updated_at: new Date().toISOString() })
        .eq("id", activeGoal.id);
    }

    // Fetch recent videos (up to 50)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=50&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    let videosSynced = 0;
    const videoErrors: string[] = [];

    if (searchRes.ok && searchData.items?.length) {
      const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
        const videosRes = await fetch(videosUrl);
        const videosData = await videosRes.json();

        if (videosRes.ok && videosData.items?.length) {
          for (const video of videosData.items) {
            const videoStats = video.statistics;
            const contentDetails = video.contentDetails;

            // Parse ISO 8601 duration (PT#H#M#S) to seconds
            let durationSeconds = 0;
            if (contentDetails?.duration) {
              const match = contentDetails.duration.match(
                /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
              );
              if (match) {
                durationSeconds =
                  (parseInt(match[1] || "0", 10) * 3600) +
                  (parseInt(match[2] || "0", 10) * 60) +
                  parseInt(match[3] || "0", 10);
              }
            }

            // Extract thumbnail URL (prefer maxres, then medium, then default)
            const thumbnailUrl =
              video.snippet?.thumbnails?.maxres?.url ||
              video.snippet?.thumbnails?.high?.url ||
              video.snippet?.thumbnails?.medium?.url ||
              video.snippet?.thumbnails?.default?.url ||
              null;

            // Extract description and tags
            const videoDescription = video.snippet?.description || null;
            const videoTags = video.snippet?.tags || null;

            const { error: upsertError } = await supabase
              .from("youtube_video_stats")
              .upsert(
                {
                  workspace_id,
                  youtube_video_id: video.id,
                  title: video.snippet?.title || "Untitled",
                  description: videoDescription,
                  tags: videoTags,
                  views: parseInt(videoStats.viewCount, 10) || 0,
                  likes: parseInt(videoStats.likeCount, 10) || 0,
                  comments: parseInt(videoStats.commentCount, 10) || 0,
                  watch_time_minutes: 0,
                  ctr_percent: 0,
                  avg_view_duration_seconds: durationSeconds,
                  thumbnail_url: thumbnailUrl,
                  published_at: video.snippet?.publishedAt || null,
                  fetched_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,youtube_video_id" }
              );

            if (upsertError) {
              videoErrors.push(`${video.id}: ${upsertError.message}`);
              console.error(`Video upsert error for ${video.id}:`, upsertError.message);
            } else {
              videosSynced++;
            }
          }
        }
      }
    }

    const result = {
      success: true,
      channel: {
        name: channel.snippet?.title,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        total_view_count: totalViewCount,
      },
      videos_synced: videosSynced,
      video_errors: videoErrors,
      synced_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
