import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope: "openid profile email offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite",
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
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function getOutlookCredentials(supabase: any, workspaceId: string) {
  const { data: integration, error } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("integration_key", "ms_outlook")
    .single();

  if (error || !integration?.config) {
    throw new Error("Outlook integration not configured.");
  }

  const config = integration.config as Record<string, string>;
  const { tenant_id, client_id, client_secret, refresh_token } = config;

  if (!tenant_id || !client_id || !client_secret || !refresh_token) {
    throw new Error("Outlook integration missing required credentials.");
  }

  const tokenResult = await refreshAccessToken(tenant_id, client_id, client_secret, refresh_token);

  // Persist rotated refresh token
  if (tokenResult.refresh_token && tokenResult.refresh_token !== refresh_token) {
    await supabase
      .from("workspace_integrations")
      .update({ config: { ...config, refresh_token: tokenResult.refresh_token } })
      .eq("workspace_id", workspaceId)
      .eq("integration_key", "ms_outlook");
  }

  return tokenResult.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, action, message_ids } = await req.json();

    if (!workspace_id || !action || !message_ids?.length) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id, action, or message_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessToken = await getOutlookCredentials(supabase, workspace_id);

    const results: { message_id: string; success: boolean; error?: string }[] = [];

    for (const messageId of message_ids) {
      try {
        if (action === "delete") {
          // Move to Deleted Items on Outlook
          const res = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/move`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ destinationId: "deleteditems" }),
          });

          if (!res.ok) {
            const errText = await res.text();
            results.push({ message_id: messageId, success: false, error: errText });
            continue;
          }
          await res.json(); // consume body
        } else if (action === "junk") {
          // Report as junk (moves to junk and reports to Microsoft)
          // Graph API: POST /me/messages/{id}/move to junkemail
          // Note: For full junk reporting, we use the move + mark approach
          const res = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/move`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ destinationId: "junkemail" }),
          });

          if (!res.ok) {
            const errText = await res.text();
            results.push({ message_id: messageId, success: false, error: errText });
            continue;
          }
          await res.json(); // consume body
        } else {
          results.push({ message_id: messageId, success: false, error: `Unknown action: ${action}` });
          continue;
        }

        results.push({ message_id: messageId, success: true });
      } catch (err) {
        results.push({ message_id: messageId, success: false, error: err.message });
      }
    }

    const allSuccess = results.every((r) => r.success);
    return new Response(
      JSON.stringify({ success: allSuccess, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("outlook-manage error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
