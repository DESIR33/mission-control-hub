import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function testYouTube(config: Record<string, string>) {
  const errors: string[] = [];
  let channel_found = false;
  let channel_name = "";
  let api_key_valid = false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${config.channel_id}&key=${config.api_key}`
    );
    const json = await res.json();
    api_key_valid = res.ok;
    if (!res.ok) errors.push(json.error?.message || "Invalid API key");
    if (json.items?.length > 0) {
      channel_found = true;
      channel_name = json.items[0].snippet?.title || "";
    } else if (res.ok) {
      errors.push("Channel ID not found");
    }
  } catch (e) {
    errors.push(`Network error: ${e.message}`);
  }

  return { valid: api_key_valid && channel_found, service: "youtube", details: { api_key_valid, channel_found, channel_name }, errors };
}

async function testResend(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.resend.com/api-keys", {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (res.ok) return { valid: true, service: "resend", details: { authenticated: true }, errors: [] };
    const body = await res.text();
    return { valid: false, service: "resend", errors: [`Auth failed: ${body}`] };
  } catch (e) {
    return { valid: false, service: "resend", errors: [e.message] };
  }
}

async function testFirecrawl(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", formats: ["markdown"], onlyMainContent: true }),
    });
    const json = await res.json();
    if (res.ok || json.success) return { valid: true, service: "firecrawl", details: { authenticated: true }, errors: [] };
    return { valid: false, service: "firecrawl", errors: [json.error || "Authentication failed"] };
  } catch (e) {
    return { valid: false, service: "firecrawl", errors: [e.message] };
  }
}

async function testSlack(config: Record<string, string>) {
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.bot_token}`, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (json.ok) return { valid: true, service: "slack", details: { team: json.team, user: json.user }, errors: [] };
    return { valid: false, service: "slack", errors: [json.error || "Auth failed"] };
  } catch (e) {
    return { valid: false, service: "slack", errors: [e.message] };
  }
}

async function testStripe(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${config.secret_key}` },
    });
    if (res.ok) return { valid: true, service: "stripe", details: { authenticated: true }, errors: [] };
    const json = await res.json();
    return { valid: false, service: "stripe", errors: [json.error?.message || "Auth failed"] };
  } catch (e) {
    return { valid: false, service: "stripe", errors: [e.message] };
  }
}

async function testPerplexity(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
    });
    if (res.ok) return { valid: true, service: "perplexity", details: { authenticated: true }, errors: [] };
    const json = await res.json();
    return { valid: false, service: "perplexity", errors: [json.error?.message || "Auth failed"] };
  } catch (e) {
    return { valid: false, service: "perplexity", errors: [e.message] };
  }
}

async function testNotion(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${config.integration_token}`, "Notion-Version": "2022-06-28" },
    });
    if (res.ok) {
      const json = await res.json();
      return { valid: true, service: "notion", details: { name: json.name }, errors: [] };
    }
    return { valid: false, service: "notion", errors: ["Invalid integration token"] };
  } catch (e) {
    return { valid: false, service: "notion", errors: [e.message] };
  }
}

async function testGitHub(config: Record<string, string>) {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${config.personal_access_token}`, Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const json = await res.json();
      return { valid: true, service: "github", details: { login: json.login }, errors: [] };
    }
    return { valid: false, service: "github", errors: ["Invalid token"] };
  } catch (e) {
    return { valid: false, service: "github", errors: [e.message] };
  }
}

async function testConvertKit(config: Record<string, string>) {
  try {
    const res = await fetch(`https://api.convertkit.com/v3/account?api_secret=${config.api_secret}`);
    if (res.ok) return { valid: true, service: "convertkit", details: { authenticated: true }, errors: [] };
    return { valid: false, service: "convertkit", errors: ["Invalid API credentials"] };
  } catch (e) {
    return { valid: false, service: "convertkit", errors: [e.message] };
  }
}

async function testBeehiiv(config: Record<string, string>) {
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${config.publication_id}`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (res.ok) return { valid: true, service: "beehiiv", details: { authenticated: true }, errors: [] };
    return { valid: false, service: "beehiiv", errors: ["Invalid API key or publication ID"] };
  } catch (e) {
    return { valid: false, service: "beehiiv", errors: [e.message] };
  }
}

async function testMailchimp(config: Record<string, string>) {
  try {
    const res = await fetch(`https://${config.server_prefix}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (res.ok) return { valid: true, service: "mailchimp", details: { authenticated: true }, errors: [] };
    return { valid: false, service: "mailchimp", errors: ["Invalid API key or server prefix"] };
  } catch (e) {
    return { valid: false, service: "mailchimp", errors: [e.message] };
  }
}

async function testN8n(config: Record<string, string>) {
  try {
    const url = config.instance_url?.replace(/\/$/, "");
    const res = await fetch(`${url}/api/v1/workflows?limit=1`, {
      headers: { "X-N8N-API-KEY": config.api_key },
    });
    if (res.ok) return { valid: true, service: "n8n", details: { authenticated: true }, errors: [] };
    return { valid: false, service: "n8n", errors: ["Cannot reach n8n instance or invalid API key"] };
  } catch (e) {
    return { valid: false, service: "n8n", errors: [e.message] };
  }
}

const TESTERS: Record<string, (config: Record<string, string>) => Promise<any>> = {
  youtube: testYouTube,
  resend: testResend,
  firecrawl: testFirecrawl,
  slack: testSlack,
  stripe: testStripe,
  perplexity: testPerplexity,
  notion: testNotion,
  github: testGitHub,
  convertkit: testConvertKit,
  beehiiv: testBeehiiv,
  mailchimp: testMailchimp,
  n8n: testN8n,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, integration_key } = await req.json();
    if (!workspace_id || !integration_key) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
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
      return new Response(JSON.stringify({ valid: false, service: integration_key, errors: ["No config found — connect the integration first"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tester = TESTERS[integration_key];
    if (!tester) {
      // No tester available for this integration (ms_outlook, twitter, paypal)
      return new Response(JSON.stringify({ valid: true, service: integration_key, details: { note: "Credentials saved. No automated test available for this service." }, errors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await tester(data.config as Record<string, string>);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, errors: [err.message] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
