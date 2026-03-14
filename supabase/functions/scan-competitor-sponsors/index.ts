import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SPONSOR_PATTERNS = [
  /sponsored by\s+(\w[\w\s&'.,-]+)/gi,
  /thanks to\s+(\w[\w\s&'.,-]+)\s+for sponsoring/gi,
  /brought to you by\s+(\w[\w\s&'.,-]+)/gi,
  /use code\s+[\w]+\s+at\s+(\w[\w\s&'.,-]+)/gi,
  /check out\s+(\w[\w\s&'.,-]+\.com)/gi,
  /(?:promo|discount|coupon)\s+code.*?(?:at|for)\s+(\w[\w\s&'.,-]+)/gi,
  /#ad\b/gi,
  /paid\s+(?:promotion|partnership|sponsor)/gi,
  /includes?\s+paid\s+promotion/gi,
];

const URL_SPONSOR_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(com|co|io|org|net|app|dev)/gi;

// Known non-sponsor domains to filter out
const EXCLUDE_DOMAINS = new Set([
  "youtube", "youtu", "google", "twitter", "instagram", "facebook",
  "tiktok", "linkedin", "reddit", "discord", "twitch", "patreon",
  "paypal", "venmo", "cashapp", "bit", "goo", "t", "amzn",
  "amazon", "github", "stackoverflow", "wikipedia", "imgur",
]);

function extractSponsorsFromDescription(
  desc: string,
  channelName: string,
): { name: string; url?: string; method: string }[] {
  const sponsors: { name: string; url?: string; method: string }[] = [];
  const seen = new Set<string>();

  // Regex pattern matching
  for (const pattern of SPONSOR_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(desc)) !== null) {
      if (match[1]) {
        const name = match[1].trim().replace(/\s+/g, " ").slice(0, 60);
        const key = name.toLowerCase();
        if (name.length >= 3 && !seen.has(key)) {
          seen.add(key);
          sponsors.push({ name, method: "regex" });
        }
      }
    }
  }

  // Detect #ad or paid promotion flags
  if (/#ad\b/i.test(desc) || /paid\s+promot/i.test(desc)) {
    // Extract URLs from the description as potential sponsor links
    URL_SPONSOR_PATTERN.lastIndex = 0;
    let urlMatch;
    while ((urlMatch = URL_SPONSOR_PATTERN.exec(desc)) !== null) {
      const domain = urlMatch[1].toLowerCase();
      if (!EXCLUDE_DOMAINS.has(domain) && !seen.has(domain)) {
        seen.add(domain);
        const url = urlMatch[0].startsWith("http")
          ? urlMatch[0]
          : `https://${urlMatch[0]}`;
        sponsors.push({
          name: domain.charAt(0).toUpperCase() + domain.slice(1),
          url,
          method: "url_extraction",
        });
      }
    }
  }

  return sponsors;
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get all competitor channels
    const { data: competitors, error: compError } = await supabase
      .from("competitor_channels")
      .select("id, channel_name, channel_url, youtube_channel_id")
      .eq("workspace_id", workspace_id);

    if (compError) throw compError;
    if (!competitors?.length) {
      return new Response(
        JSON.stringify({ success: true, scanned: 0, sponsors_found: 0, message: "No competitors to scan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      throw new Error("YouTube integration not configured. Add your YouTube API key in Settings.");
    }

    const apiKey = ytIntegration.config.api_key;
    const sponsorMap: Record<string, {
      name: string;
      url?: string;
      methods: Set<string>;
      channels: Set<string>;
      count: number;
    }> = {};

    let scannedChannels = 0;
    const allDescriptions: { text: string; channel: string; title: string }[] = [];

    for (const comp of competitors.slice(0, 10)) {
      let channelId = comp.youtube_channel_id;

      // Resolve handle to channel ID if needed
      if (!channelId && comp.channel_url) {
        const handleMatch = comp.channel_url.match(/@([\w-]+)/);
        if (handleMatch) {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handleMatch[1]}&key=${apiKey}`,
          );
          const data = await res.json();
          channelId = data.items?.[0]?.id;
        }
      }

      if (!channelId) continue;

      // Get recent videos (last 20)
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=20&key=${apiKey}`,
      );
      const searchData = await searchRes.json();
      if (!searchData.items?.length) continue;

      const videoIds = searchData.items
        .map((i: any) => i.id?.videoId)
        .filter(Boolean)
        .join(",");

      // Get video details
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${apiKey}`,
      );
      const videosData = await videosRes.json();

      for (const video of videosData.items || []) {
        const desc = video.snippet?.description || "";
        const title = video.snippet?.title || "";
        const fullText = `${title}\n${desc}`;

        // Collect for AI analysis
        if (desc.length > 50) {
          allDescriptions.push({
            text: desc.slice(0, 1500),
            channel: comp.channel_name,
            title: title.slice(0, 100),
          });
        }

        // Regex + URL extraction
        const detected = extractSponsorsFromDescription(fullText, comp.channel_name);
        for (const s of detected) {
          const key = s.name.toLowerCase();
          if (!sponsorMap[key]) {
            sponsorMap[key] = {
              name: s.name,
              url: s.url,
              methods: new Set(),
              channels: new Set(),
              count: 0,
            };
          }
          sponsorMap[key].methods.add(s.method);
          sponsorMap[key].channels.add(comp.channel_name);
          sponsorMap[key].count++;
          if (s.url && !sponsorMap[key].url) sponsorMap[key].url = s.url;
        }
      }

      scannedChannels++;
    }

    // AI-enhanced analysis
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openrouterKey && allDescriptions.length > 0) {
      try {
        const descriptionsText = allDescriptions
          .slice(0, 15)
          .map((d) => `[${d.channel} — ${d.title}]\n${d.text}`)
          .join("\n---\n");

        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3.5-sonnet",
            max_tokens: 1500,
            messages: [
              {
                role: "user",
                content: `Analyze these YouTube video descriptions from competitor channels and extract ALL sponsor/brand mentions, affiliate links, and paid partnerships. Include companies mentioned with discount codes, referral links, or sponsorship disclosures (#ad, paid promotion, etc).

Return ONLY a JSON array of objects with:
- "name": company name (clean, properly capitalized)
- "url": company website if found (or null)
- "channel": which competitor channel it appeared on

Do NOT include the video creator's own brand/channel.

Descriptions:\n${descriptionsText}`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const aiSponsors = JSON.parse(jsonMatch[0]);
              for (const s of aiSponsors) {
                if (!s.name || s.name.length < 2) continue;
                const key = s.name.toLowerCase().trim();
                if (!sponsorMap[key]) {
                  sponsorMap[key] = {
                    name: s.name.trim(),
                    url: s.url || undefined,
                    methods: new Set(),
                    channels: new Set(),
                    count: 0,
                  };
                }
                sponsorMap[key].methods.add("ai");
                if (s.channel) sponsorMap[key].channels.add(s.channel);
                sponsorMap[key].count++;
                if (s.url && !sponsorMap[key].url) sponsorMap[key].url = s.url;
              }
            } catch { /* parse error — continue */ }
          }
        }
      } catch { /* AI failed — continue with regex */ }
    }

    // Get existing CRM companies for matching
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .eq("workspace_id", workspace_id);

    const companyNameMap = new Map<string, string>();
    for (const c of companies || []) {
      companyNameMap.set(c.name.toLowerCase(), c.id);
    }

    // Get existing deals
    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, company_id, stage")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    const companyDealMap = new Map<string, { id: string; stage: string }>();
    for (const d of deals || []) {
      if (d.company_id) {
        companyDealMap.set(d.company_id, { id: d.id, stage: d.stage });
      }
    }

    // Upsert sponsors
    const sponsorsToUpsert = Object.values(sponsorMap).map((s) => {
      const channels = Array.from(s.channels);
      const matchedCompanyId = companyNameMap.get(s.name.toLowerCase()) || null;
      const matchedDeal = matchedCompanyId ? companyDealMap.get(matchedCompanyId) : null;

      let outreachStatus = "not_contacted";
      if (matchedDeal) {
        outreachStatus = matchedDeal.stage === "closed_won" || matchedDeal.stage === "closed_lost"
          ? matchedDeal.stage === "closed_won" ? "in_pipeline" : "declined"
          : "contacted";
      }

      const competitorCount = channels.length;
      const suggestion = competitorCount >= 2
        ? `${s.name} sponsors ${competitorCount} of your competitors (${channels.slice(0, 3).join(", ")}). Consider reaching out for a sponsorship deal.`
        : `${s.name} sponsors ${channels[0]}. This could be a potential sponsorship opportunity.`;

      return {
        workspace_id,
        sponsor_name: s.name,
        sponsor_url: s.url || null,
        detection_method: Array.from(s.methods).join(","),
        mention_count: s.count,
        competitor_channels: channels,
        company_id: matchedCompanyId,
        deal_id: matchedDeal?.id || null,
        outreach_status: outreachStatus,
        outreach_suggestion: suggestion,
        last_detected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    let upserted = 0;
    // Batch upsert in chunks of 50
    for (let i = 0; i < sponsorsToUpsert.length; i += 50) {
      const chunk = sponsorsToUpsert.slice(i, i + 50);
      const { error: upsertError } = await supabase
        .from("competitor_sponsors")
        .upsert(chunk, { onConflict: "workspace_id,sponsor_name" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      } else {
        upserted += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: scannedChannels,
        sponsors_found: upserted,
        total_mentions: Object.values(sponsorMap).reduce((s, v) => s + v.count, 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("scan-competitor-sponsors error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
