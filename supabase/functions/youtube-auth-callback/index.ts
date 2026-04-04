import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, code, redirect_uri: clientRedirectUri } = await req.json();

    if (!workspace_id || !code) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get existing config
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .single();

    if (intError || !integration?.config) {
      return new Response(
        JSON.stringify({ error: "YouTube integration not found. Configure client_id and client_secret first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = integration.config as Record<string, string>;
    const { client_id, client_secret } = config;
    const redirect_uri = clientRedirectUri || config.redirect_uri;

    if (!client_id || !client_secret || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing client_id, client_secret, or redirect_uri in integration config." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Exchange auth code for tokens
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id,
      client_secret,
      code,
      redirect_uri,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Google token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      throw new Error("No refresh_token returned from Google. Ensure access_type=offline and prompt=consent were used.");
    }

    // Update the integration config with the new refresh_token
    const updatedConfig = {
      ...config,
      refresh_token: refreshToken,
      redirect_uri,
    };

    const { error: updateError } = await supabase
      .from("workspace_integrations")
      .update({
        config: updatedConfig,
        enabled: true,
        connected_at: new Date().toISOString(),
      } as any)
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube");

    if (updateError) {
      throw new Error(`Failed to save refresh token: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "YouTube connected successfully via OAuth." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("youtube-auth-callback error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
