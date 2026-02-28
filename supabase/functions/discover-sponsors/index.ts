import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPONSOR_PATTERNS = [
  /sponsored by\s+(\w[\w\s&'.]+)/gi,
  /thanks to\s+(\w[\w\s&'.]+)\s+for sponsoring/gi,
  /brought to you by\s+(\w[\w\s&'.]+)/gi,
  /use code\s+[\w]+\s+at\s+(\w[\w\s&'.]+)/gi,
  /check out\s+(\w[\w\s&'.]+\.com)/gi,
  /(?:promo|discount|coupon)\s+code.*?(?:at|for)\s+(\w[\w\s&'.]+)/gi,
];

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

    const { workspace_id, channel_urls } = await req.json();
    if (!workspace_id || !channel_urls?.length) {
      throw new Error("Missing workspace_id or channel_urls");
    }

    // Get YouTube API key
    const { data: ytIntegration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (!ytIntegration?.config?.api_key) {
      throw new Error("YouTube integration not configured.");
    }

    const apiKey = ytIntegration.config.api_key;
    const sponsorMap: Record<string, { count: number; sources: string[] }> = {};

    for (const channelUrl of channel_urls.slice(0, 5)) {
      // Extract channel ID or handle
      const handleMatch = channelUrl.match(/@([\w-]+)/);
      const idMatch = channelUrl.match(/UC[\w-]{22}/);

      let channelId = idMatch?.[0];

      if (!channelId && handleMatch) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handleMatch[1]}&key=${apiKey}`
        );
        const data = await res.json();
        channelId = data.items?.[0]?.id;
      }

      if (!channelId) continue;

      // Get recent videos
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=10&key=${apiKey}`
      );
      const searchData = await searchRes.json();

      if (!searchData.items?.length) continue;

      const videoIds = searchData.items.map((i: any) => i.id?.videoId).filter(Boolean).join(",");

      // Get video descriptions
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${apiKey}`
      );
      const videosData = await videosRes.json();

      for (const video of videosData.items || []) {
        const desc = video.snippet?.description || "";

        for (const pattern of SPONSOR_PATTERNS) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(desc)) !== null) {
            const name = match[1].trim().replace(/\s+/g, " ").slice(0, 50);
            if (name.length < 3) continue;

            if (!sponsorMap[name]) {
              sponsorMap[name] = { count: 0, sources: [] };
            }
            sponsorMap[name].count++;
            const source = `${video.snippet?.channelTitle}: ${video.snippet?.title}`;
            if (!sponsorMap[name].sources.includes(source)) {
              sponsorMap[name].sources.push(source);
            }
          }
        }
      }
    }

    // Sort by frequency
    const sponsors = Object.entries(sponsorMap)
      .map(([name, data]) => ({
        name,
        mentions: data.count,
        sources: data.sources.slice(0, 3),
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 20);

    return new Response(
      JSON.stringify({ success: true, sponsors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
