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

    const { workspace_id, notification_id, video_id, video_title, video_url, thumbnail_url } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get or create notification record
    let notifId = notification_id;
    if (!notifId && video_id) {
      const { data: notif, error } = await supabase
        .from("subscriber_video_notifications")
        .insert({
          workspace_id,
          video_id,
          video_title: video_title || null,
          video_url: video_url || `https://youtube.com/watch?v=${video_id}`,
          thumbnail_url: thumbnail_url || null,
          status: "sending",
        })
        .select("id")
        .single();

      if (error) throw error;
      notifId = notif.id;
    }

    if (!notifId) throw new Error("Missing notification_id or video_id");

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from("subscriber_video_notifications")
      .select("*")
      .eq("id", notifId)
      .single();

    if (notifError) throw notifError;

    // Update status to sending
    await supabase
      .from("subscriber_video_notifications")
      .update({ status: "sending" })
      .eq("id", notifId);

    // Get all active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, first_name")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (subError) throw subError;

    // Get Resend config
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "resend")
      .eq("enabled", true)
      .maybeSingle();

    if (!integration?.config?.api_key) {
      await supabase
        .from("subscriber_video_notifications")
        .update({ status: "failed", total_recipients: subscribers?.length || 0 })
        .eq("id", notifId);

      return new Response(
        JSON.stringify({ success: false, message: "Resend not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = integration.config.api_key;
    const fromEmail = integration.config.from_email || "noreply@example.com";
    const videoUrl = notification.video_url || `https://youtube.com/watch?v=${notification.video_id}`;

    let sentCount = 0;
    const totalRecipients = subscribers?.length || 0;

    // Create notification logs and send emails
    for (const sub of (subscribers || [])) {
      // Create log entry
      await supabase
        .from("subscriber_notification_logs")
        .insert({
          notification_id: notifId,
          subscriber_id: sub.id,
          status: "pending",
        });

      const subject = notification.email_subject ||
        `New Video: ${notification.video_title || "Check out my latest video!"}`;

      const body = notification.email_body ||
        `Hi ${sub.first_name || "there"},\n\nI just published a new video: ${notification.video_title || "Check it out!"}\n\nWatch it here: ${videoUrl}\n\nThanks for being a subscriber!`;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [sub.email],
            subject,
            text: body,
          }),
        });

        if (resendRes.ok) {
          sentCount++;
          await supabase
            .from("subscriber_notification_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("notification_id", notifId)
            .eq("subscriber_id", sub.id);
        } else {
          await supabase
            .from("subscriber_notification_logs")
            .update({ status: "failed" })
            .eq("notification_id", notifId)
            .eq("subscriber_id", sub.id);
        }
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err);
        await supabase
          .from("subscriber_notification_logs")
          .update({ status: "failed" })
          .eq("notification_id", notifId)
          .eq("subscriber_id", sub.id);
      }
    }

    // Update notification status
    await supabase
      .from("subscriber_video_notifications")
      .update({
        status: "sent",
        total_recipients: totalRecipients,
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notifId);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: totalRecipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
