import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { workspace_id } = body;

    // If workspace_id provided, check that one. Otherwise check all enabled YouTube integrations.
    let workspaces: string[] = [];

    if (workspace_id) {
      workspaces = [workspace_id];
    } else {
      const { data: integrations } = await supabase
        .from("workspace_integrations")
        .select("workspace_id")
        .eq("integration_key", "youtube")
        .eq("enabled", true);
      workspaces = (integrations ?? []).map((i: any) => i.workspace_id);
    }

    const results: Record<string, any> = {};

    for (const wsId of workspaces) {
      const result = await checkTokenHealth(supabase, wsId);
      results[wsId] = result;

      // Upsert health record
      await supabase.from("integration_token_health").upsert(
        {
          workspace_id: wsId,
          integration_key: "youtube",
          status: result.status,
          last_checked_at: new Date().toISOString(),
          last_healthy_at: result.status === "healthy" ? new Date().toISOString() : undefined,
          error_message: result.error || null,
          expires_in_seconds: result.expires_in_seconds || null,
        },
        { onConflict: "workspace_id,integration_key" },
      );

      // If token is degraded or expired, create a strategist notification
      if (result.status === "degraded" || result.status === "expired") {
        const message =
          result.status === "expired"
            ? `YouTube OAuth token has expired. Re-authorize in Integrations to restore analytics sync.`
            : `YouTube OAuth token expires soon (${Math.round((result.expires_in_seconds || 0) / 3600)}h). Consider re-authorizing.`;

        await supabase.from("strategist_notifications").insert({
          workspace_id: wsId,
          title: `YouTube Token ${result.status === "expired" ? "Expired" : "Expiring Soon"}`,
          body: message,
          read: false,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function checkTokenHealth(
  supabase: any,
  workspaceId: string,
): Promise<{ status: "healthy" | "degraded" | "expired" | "unknown"; error?: string; expires_in_seconds?: number }> {
  // Get integration config
  const { data: integration, error: intError } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("integration_key", "youtube")
    .eq("enabled", true)
    .single();

  if (intError || !integration?.config) {
    return { status: "unknown", error: "YouTube integration not configured" };
  }

  const config = integration.config as Record<string, string>;
  const { refresh_token, client_id, client_secret } = config;

  if (!refresh_token || !client_id || !client_secret) {
    return { status: "unknown", error: "OAuth credentials incomplete — missing refresh_token, client_id, or client_secret" };
  }

  // Attempt to refresh the access token
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id,
        client_secret,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      const isRevoked = errBody.includes("invalid_grant") || errBody.includes("Token has been expired or revoked");
      return {
        status: "expired",
        error: isRevoked
          ? "Refresh token revoked or expired. Re-authorize YouTube in Integrations."
          : `Token refresh failed (${tokenRes.status}): ${errBody}`,
      };
    }

    const tokenData = await tokenRes.json();
    const expiresIn = tokenData.expires_in || 3600;

    // Validate the access token with a lightweight API call
    const testRes = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokenData.access_token}`,
    );

    if (!testRes.ok) {
      return { status: "degraded", error: "Token refreshed but validation failed", expires_in_seconds: expiresIn };
    }

    return { status: "healthy", expires_in_seconds: expiresIn };
  } catch (e: any) {
    return { status: "expired", error: `Token check failed: ${e.message}` };
  }
}
