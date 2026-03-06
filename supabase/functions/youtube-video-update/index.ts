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
    return data.access_token;
  }

  const errBody = await res.text();
  throw new Error(`OAuth token refresh failed (${res.status}): ${errBody}`);
}

async function getYouTubeAuth(supabase: any, workspaceId: string) {
  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("integration_key", "youtube")
    .single();

  if (!integration?.config) {
    throw new Error("YouTube integration not configured");
  }

  const config = integration.config;
  const refreshToken = config.refresh_token;
  const clientId = config.client_id;
  const clientSecret = config.client_secret;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Missing YouTube OAuth credentials (refresh_token, client_id, client_secret)");
  }

  const accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);

  // Check rate limit (daily quota tracking)
  const today = new Date().toISOString().split("T")[0];
  const dailyUsage = config._api_usage?.[today] || 0;
  const DAILY_LIMIT = 9000; // Leave buffer from YouTube's 10,000 quota

  if (dailyUsage >= DAILY_LIMIT) {
    throw new Error(`YouTube API daily quota limit reached (${dailyUsage}/${DAILY_LIMIT}). Try again tomorrow.`);
  }

  return { accessToken, config, dailyUsage, today };
}

async function updateQuotaUsage(supabase: any, workspaceId: string, config: any, today: string, quotaCost: number) {
  const usage = config._api_usage || {};
  usage[today] = (usage[today] || 0) + quotaCost;

  // Clean up old dates (keep last 7 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  for (const key of Object.keys(usage)) {
    if (new Date(key) < cutoff) delete usage[key];
  }

  await supabase
    .from("workspace_integrations")
    .update({ config: { ...config, _api_usage: usage } })
    .eq("workspace_id", workspaceId)
    .eq("integration_key", "youtube");
}

async function getVideoSnippet(accessToken: string, videoId: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch video ${videoId}: ${err}`);
  }

  const data = await res.json();
  if (!data.items?.length) {
    throw new Error(`Video not found: ${videoId}`);
  }

  return data.items[0];
}

async function updateVideoMetadata(
  accessToken: string,
  videoId: string,
  updates: { title?: string; description?: string; tags?: string[] }
) {
  // First fetch current video to preserve fields we're not changing
  const video = await getVideoSnippet(accessToken, videoId);
  const snippet = video.snippet;

  const updatedSnippet: Record<string, unknown> = {
    categoryId: snippet.categoryId,
    title: updates.title || snippet.title,
    description: updates.description !== undefined ? updates.description : snippet.description,
    tags: updates.tags || snippet.tags || [],
  };

  const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: videoId,
      snippet: updatedSnippet,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update video ${videoId}: ${err}`);
  }

  return await res.json();
}

async function updateVideoThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailUrl: string
) {
  // Download the thumbnail image
  const imgRes = await fetch(thumbnailUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download thumbnail from ${thumbnailUrl}`);
  }
  const imgBlob = await imgRes.blob();

  // Upload to YouTube
  const uploadUrl = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": imgBlob.type || "image/png",
    },
    body: imgBlob,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload thumbnail for ${videoId}: ${err}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, workspace_id, video_id, title, description, tags, thumbnail_url } = await req.json();

    if (!workspace_id || !video_id) {
      throw new Error("Missing workspace_id or video_id");
    }

    const supabase = getSupabaseAdmin();
    const { accessToken, config, today } = await getYouTubeAuth(supabase, workspace_id);

    let result: Record<string, unknown> = {};
    let quotaCost = 0;

    switch (action) {
      case "update_metadata": {
        // Quota cost: 1 (read) + 50 (write) = 51
        quotaCost = 51;
        const video = await updateVideoMetadata(accessToken, video_id, { title, description, tags });
        result = {
          action: "update_metadata",
          video_id,
          updated_title: video.snippet.title,
          updated_description: video.snippet.description?.substring(0, 100),
          updated_tags_count: video.snippet.tags?.length || 0,
        };
        break;
      }

      case "update_thumbnail": {
        if (!thumbnail_url) throw new Error("Missing thumbnail_url");
        // Quota cost: 50 (thumbnail upload)
        quotaCost = 50;
        await updateVideoThumbnail(accessToken, video_id, thumbnail_url);
        result = {
          action: "update_thumbnail",
          video_id,
          thumbnail_url,
        };
        break;
      }

      case "get_current_state": {
        // Quota cost: 1 (read)
        quotaCost = 1;
        const video = await getVideoSnippet(accessToken, video_id);
        result = {
          action: "get_current_state",
          video_id,
          title: video.snippet.title,
          description: video.snippet.description,
          tags: video.snippet.tags || [],
          thumbnail_url: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || "",
          category_id: video.snippet.categoryId,
          view_count: video.statistics?.viewCount,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update quota tracking
    await updateQuotaUsage(supabase, workspace_id, config, today, quotaCost);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("youtube-video-update error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
