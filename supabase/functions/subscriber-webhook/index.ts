import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id,
      email,
      first_name,
      last_name,
      source,
      source_video_id,
      source_video_title,
      guide_requested,
      page_url,
      referrer,
      timestamp,
    } = body;

    if (!workspace_id) throw new Error("Missing workspace_id");
    if (!email) throw new Error("Missing email");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format");

    // Authenticate: require a valid webhook secret for this workspace
    const webhookSecret = req.headers.get("x-webhook-secret") || body.webhook_secret;
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the workspace's webhook secret from workspace_integrations or workspace settings
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("webhook_secret")
      .eq("id", workspace_id)
      .single();

    if (!workspace?.webhook_secret) {
      return new Response(JSON.stringify({ error: "Webhook not configured for this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Constant-time comparison to prevent timing attacks
    const encoder = new TextEncoder();
    const a = encoder.encode(webhookSecret);
    const b = encoder.encode(workspace.webhook_secret);
    if (a.length !== b.length) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use subtle crypto for timing-safe comparison
    const keyA = await crypto.subtle.importKey("raw", a, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigA = await crypto.subtle.sign("HMAC", keyA, encoder.encode("verify"));
    const keyB = await crypto.subtle.importKey("raw", b, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigB = await crypto.subtle.sign("HMAC", keyB, encoder.encode("verify"));

    const sigABuf = new Uint8Array(sigA);
    const sigBBuf = new Uint8Array(sigB);
    let match = true;
    for (let i = 0; i < sigABuf.length; i++) {
      if (sigABuf[i] !== sigBBuf[i]) match = false;
    }

    if (!match) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize string inputs
    const sanitize = (val: unknown): string | null => {
      if (typeof val !== "string") return null;
      return val.trim().slice(0, 500);
    };

    // Upsert subscriber (deduplicate by email within workspace)
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    let subscriberId: string;

    if (existing) {
      const { data, error } = await supabase
        .from("subscribers")
        .update({
          first_name: sanitize(first_name) || undefined,
          last_name: sanitize(last_name) || undefined,
          source: sanitize(source) || undefined,
          source_video_id: sanitize(source_video_id) || undefined,
          source_video_title: sanitize(source_video_title) || undefined,
          guide_requested: sanitize(guide_requested) || undefined,
          page_url: sanitize(page_url) || undefined,
          referrer: sanitize(referrer) || undefined,
          status: "active",
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) throw error;
      subscriberId = data.id;
    } else {
      const { data, error } = await supabase
        .from("subscribers")
        .insert({
          workspace_id,
          email,
          first_name: sanitize(first_name),
          last_name: sanitize(last_name),
          source: sanitize(source) || "website",
          source_video_id: sanitize(source_video_id),
          source_video_title: sanitize(source_video_title),
          guide_requested: sanitize(guide_requested),
          page_url: sanitize(page_url),
          referrer: sanitize(referrer),
          created_at: timestamp || new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      subscriberId = data.id;
    }

    // If guide_requested, trigger guide delivery
    if (guide_requested) {
      try {
        await supabase.functions.invoke("deliver-guide", {
          body: { workspace_id, subscriber_id: subscriberId, guide_slug: guide_requested },
        });
      } catch (err) {
        console.error("Guide delivery failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, subscriber_id: subscriberId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Bad request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
