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
    const { workspace_id, integration_key } = await req.json();
    if (!workspace_id || !integration_key) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or integration_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
