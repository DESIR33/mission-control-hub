import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fields that are secrets per integration
const SECRET_FIELDS: Record<string, string[]> = {
  ms_outlook: ["client_secret"],
  firecrawl: ["api_key"],
  twitter: ["bearer_token", "api_secret"],
  youtube: ["api_key", "client_secret", "refresh_token"],
  convertkit: ["api_key", "api_secret"],
  beehiiv: ["api_key"],
  mailchimp: ["api_key"],
  resend: ["api_key"],
  slack: ["bot_token", "signing_secret"],
  notion: ["integration_token"],
  github: ["personal_access_token"],
  perplexity: ["api_key"],
  stripe: ["secret_key", "webhook_secret"],
  paypal: ["client_secret"],
  n8n: ["api_key"],
};

function maskValue(val: string): string {
  if (!val || val.length <= 4) return "••••";
  return "••••••••" + val.slice(-4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { workspace_id, integration_key } = await req.json();
    if (!workspace_id || !integration_key) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or integration_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verify user is a member of the workspace ---
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: membership } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await adminClient
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", integration_key)
      .single();

    if (error || !data?.config) {
      return new Response(JSON.stringify({ masked_config: {}, raw_non_secret: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = data.config as Record<string, string>;
    const secretFields = SECRET_FIELDS[integration_key] ?? [];
    const masked_config: Record<string, string> = {};
    const raw_non_secret: Record<string, string> = {};

    for (const [key, val] of Object.entries(config)) {
      if (secretFields.includes(key)) {
        masked_config[key] = maskValue(val);
      } else {
        masked_config[key] = val;
        raw_non_secret[key] = val;
      }
    }

    return new Response(JSON.stringify({ masked_config, raw_non_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
