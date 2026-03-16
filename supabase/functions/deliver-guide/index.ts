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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, subscriber_id, guide_slug } = await req.json();
    if (!workspace_id || !subscriber_id || !guide_slug) {
      throw new Error("Missing workspace_id, subscriber_id, or guide_slug");
    }

    // Get the guide
    const { data: guide, error: guideError } = await supabase
      .from("subscriber_guides")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("slug", guide_slug)
      .eq("status", "active")
      .maybeSingle();

    if (guideError) throw guideError;
    if (!guide) {
      return new Response(
        JSON.stringify({ success: false, message: `Guide '${guide_slug}' not found` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the subscriber
    const { data: subscriber, error: subError } = await supabase
      .from("subscribers")
      .select("*")
      .eq("id", subscriber_id)
      .single();

    if (subError) throw subError;

    // Get Resend integration
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "resend")
      .eq("enabled", true)
      .maybeSingle();

    if (!integration?.config?.api_key) {
      return new Response(
        JSON.stringify({ success: false, message: "Resend not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Render email template
    const subject = (guide.email_subject || `Here's your guide: ${guide.name}`)
      .replace(/\{\{first_name\}\}/g, subscriber.first_name || "there")
      .replace(/\{\{guide_name\}\}/g, guide.name)
      .replace(/\{\{guide_url\}\}/g, guide.file_url || "");

    const body = (guide.email_body || `Hi {{first_name}},\n\nHere's your guide: {{guide_url}}\n\nEnjoy!`)
      .replace(/\{\{first_name\}\}/g, subscriber.first_name || "there")
      .replace(/\{\{guide_name\}\}/g, guide.name)
      .replace(/\{\{guide_url\}\}/g, guide.file_url || "");

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${integration.config.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: integration.config.from_email || "noreply@example.com",
        to: [subscriber.email],
        subject,
        text: body,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error(`Resend error: ${errBody}`);
    }

    // Update subscriber
    await supabase
      .from("subscribers")
      .update({ guide_delivered_at: new Date().toISOString() })
      .eq("id", subscriber_id);

    // Increment download count
    await supabase.rpc("increment_guide_downloads" as any, { guide_id: guide.id }).catch(() => {
      // Fallback: direct update
      supabase
        .from("subscriber_guides")
        .update({ download_count: (guide.download_count || 0) + 1 })
        .eq("id", guide.id);
    });

    // Track engagement event
    await supabase
      .from("subscriber_engagement_events")
      .insert({
        workspace_id,
        subscriber_id,
        event_type: "guide_download",
        metadata: { guide_slug, guide_name: guide.name },
      });

    return new Response(
      JSON.stringify({ success: true, message: "Guide delivered" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
