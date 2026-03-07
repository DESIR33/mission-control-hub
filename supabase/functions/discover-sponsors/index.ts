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
    const sponsorMap: Record<string, { count: number; sources: string[]; descriptions: string[] }> = {};
    const allDescriptions: string[] = [];

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
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=15&key=${apiKey}`
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
        const source = `${video.snippet?.channelTitle}: ${video.snippet?.title}`;

        // Collect descriptions for AI analysis
        if (desc.length > 50) {
          allDescriptions.push(`[${source}]\n${desc.slice(0, 1500)}`);
        }

        // Regex-based extraction
        for (const pattern of SPONSOR_PATTERNS) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(desc)) !== null) {
            const name = match[1].trim().replace(/\s+/g, " ").slice(0, 50);
            if (name.length < 3) continue;

            if (!sponsorMap[name]) {
              sponsorMap[name] = { count: 0, sources: [], descriptions: [] };
            }
            sponsorMap[name].count++;
            if (!sponsorMap[name].sources.includes(source)) {
              sponsorMap[name].sources.push(source);
            }
          }
        }
      }
    }

    // AI-enhanced analysis using Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey && allDescriptions.length > 0) {
      try {
        const descriptionsText = allDescriptions.slice(0, 10).join("\n---\n");
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `Analyze these YouTube video descriptions and extract ALL sponsor/brand mentions, affiliate links, and paid partnerships. Include companies mentioned with discount codes, referral links, or sponsorship disclosures. Return ONLY a JSON array of objects with "name" (company name, clean and normalized) and "type" (one of: "sponsor", "affiliate", "product_placement"). Do not include the video creator's own brand.\n\nDescriptions:\n${descriptionsText}`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text || "";

          // Extract JSON array from response
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const aiSponsors = JSON.parse(jsonMatch[0]);
              for (const s of aiSponsors) {
                if (!s.name || s.name.length < 2) continue;
                const name = s.name.trim();
                if (!sponsorMap[name]) {
                  sponsorMap[name] = { count: 0, sources: [], descriptions: [] };
                }
                // Only add if not already detected by regex
                if (sponsorMap[name].count === 0) {
                  sponsorMap[name].count = 1;
                  sponsorMap[name].sources.push(`AI detected (${s.type || "sponsor"})`);
                }
              }
            } catch {
              // JSON parse failed — continue with regex results only
            }
          }
        }
      } catch {
        // AI analysis failed — continue with regex results only
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
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
