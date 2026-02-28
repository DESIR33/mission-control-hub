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

    const { company_id, workspace_id } = await req.json();
    if (!company_id || !workspace_id) throw new Error("Missing company_id or workspace_id");

    // Get Firecrawl config
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "firecrawl")
      .eq("enabled", true)
      .single();

    if (!integration?.config?.api_key) {
      throw new Error("Firecrawl integration not configured.");
    }

    // Get company website
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, website, description, industry, size")
      .eq("id", company_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (!company) throw new Error("Company not found");
    if (!company.website) throw new Error("Company has no website URL");

    // Scrape website via Firecrawl
    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.config.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: company.website,
        formats: ["markdown"],
      }),
    });

    if (!firecrawlRes.ok) {
      const errBody = await firecrawlRes.text();
      throw new Error(`Firecrawl API error: ${firecrawlRes.status} - ${errBody}`);
    }

    const firecrawlData = await firecrawlRes.json();
    const scrapedContent = firecrawlData.data?.markdown || "";
    const metadata = firecrawlData.data?.metadata || {};

    // Extract useful data
    const enrichmentData = {
      scraped_at: new Date().toISOString(),
      title: metadata.title || null,
      description: metadata.description || null,
      og_image: metadata.ogImage || null,
      content_preview: scrapedContent.slice(0, 2000),
      social_links: {
        twitter: metadata.twitter || null,
        linkedin: metadata.linkedin || null,
      },
    };

    // Update company with enrichment data
    const updates: Record<string, unknown> = {
      enrichment_firecrawl: enrichmentData,
    };
    if (!company.description && enrichmentData.description) {
      updates.description = enrichmentData.description;
    }

    await supabase
      .from("companies")
      .update(updates)
      .eq("id", company_id)
      .eq("workspace_id", workspace_id);

    return new Response(
      JSON.stringify({ success: true, enrichment: enrichmentData }),
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
