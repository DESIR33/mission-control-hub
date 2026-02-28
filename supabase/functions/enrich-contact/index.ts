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

    const { contact_id, workspace_id } = await req.json();
    if (!contact_id || !workspace_id) throw new Error("Missing contact_id or workspace_id");

    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, social_youtube, social_linkedin")
      .eq("id", contact_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (!contact) throw new Error("Contact not found");

    const enrichment: Record<string, unknown> = { enriched_at: new Date().toISOString() };

    // If contact has a YouTube channel, fetch their stats
    if (contact.social_youtube) {
      const { data: ytIntegration } = await supabase
        .from("workspace_integrations")
        .select("config")
        .eq("workspace_id", workspace_id)
        .eq("integration_key", "youtube")
        .eq("enabled", true)
        .single();

      if (ytIntegration?.config?.api_key) {
        const channelUrl = contact.social_youtube;
        // Try to extract channel ID from URL
        const channelIdMatch = channelUrl.match(/UC[\w-]{22}/);
        const handleMatch = channelUrl.match(/@([\w-]+)/);

        let channelData = null;

        if (channelIdMatch) {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIdMatch[0]}&key=${ytIntegration.config.api_key}`
          );
          channelData = await res.json();
        } else if (handleMatch) {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${handleMatch[1]}&key=${ytIntegration.config.api_key}`
          );
          channelData = await res.json();
        }

        if (channelData?.items?.[0]) {
          const ch = channelData.items[0];
          enrichment.youtube = {
            channel_id: ch.id,
            title: ch.snippet?.title,
            subscriber_count: parseInt(ch.statistics?.subscriberCount, 10) || 0,
            video_count: parseInt(ch.statistics?.videoCount, 10) || 0,
            view_count: parseInt(ch.statistics?.viewCount, 10) || 0,
          };
        }
      }
    }

    // If contact has LinkedIn, scrape via Firecrawl
    if (contact.social_linkedin) {
      const { data: fcIntegration } = await supabase
        .from("workspace_integrations")
        .select("config")
        .eq("workspace_id", workspace_id)
        .eq("integration_key", "firecrawl")
        .eq("enabled", true)
        .single();

      if (fcIntegration?.config?.api_key) {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${fcIntegration.config.api_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: contact.social_linkedin, formats: ["markdown"] }),
          });

          if (res.ok) {
            const data = await res.json();
            enrichment.linkedin = {
              content_preview: data.data?.markdown?.slice(0, 1000) || null,
              title: data.data?.metadata?.title || null,
            };
          }
        } catch {
          // LinkedIn scraping may fail — non-critical
        }
      }
    }

    await supabase
      .from("contacts")
      .update({ enrichment_ai: enrichment })
      .eq("id", contact_id)
      .eq("workspace_id", workspace_id);

    return new Response(
      JSON.stringify({ success: true, enrichment }),
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
