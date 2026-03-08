import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope: "https://graph.microsoft.com/.default offline_access",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, to, subject, body_html, reply_to_message_id, forward_to, comment } = await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get Outlook credentials
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "ms_outlook")
      .single();

    if (intError || !integration?.config) {
      return new Response(
        JSON.stringify({ error: "Outlook integration not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = integration.config as Record<string, string>;
    const { tenant_id, client_id, client_secret, refresh_token } = config;

    if (!tenant_id || !client_id || !client_secret || !refresh_token) {
      return new Response(
        JSON.stringify({ error: "Missing Outlook credentials." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await refreshAccessToken(tenant_id, client_id, client_secret, refresh_token);

    let graphResponse: Response;

    if (reply_to_message_id) {
      // Reply to a message
      graphResponse = await fetch(
        `${GRAPH_BASE}/me/messages/${reply_to_message_id}/reply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: body_html || comment || "",
          }),
        },
      );
    } else if (forward_to) {
      // Forward a message (requires a message_id in forward context)
      // For simplicity, we treat forward_to as a new send with the forwarded content
      graphResponse = await fetch(`${GRAPH_BASE}/me/sendMail`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: subject || "",
            body: { contentType: "HTML", content: body_html || "" },
            toRecipients: [{ emailAddress: { address: forward_to } }],
          },
        }),
      });
    } else {
      // New email
      if (!to) {
        return new Response(JSON.stringify({ error: "Missing 'to' recipient" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      graphResponse = await fetch(`${GRAPH_BASE}/me/sendMail`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: subject || "",
            body: { contentType: "HTML", content: body_html || "" },
            toRecipients: to.split(",").map((addr: string) => ({
              emailAddress: { address: addr.trim() },
            })),
          },
        }),
      });
    }

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      throw new Error(`Graph API send failed: ${graphResponse.status} ${errorText}`);
    }

    // Consume response body
    await graphResponse.text();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("outlook-send error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
