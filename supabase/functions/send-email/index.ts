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

    const { to, subject, body_html, body_text, workspace_id, contact_id, deal_id } = await req.json();

    if (!to || !subject || !workspace_id) {
      throw new Error("Missing required fields: to, subject, workspace_id");
    }

    // Get Resend integration config
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "resend")
      .eq("enabled", true)
      .single();

    if (!integration?.config?.api_key) {
      throw new Error("Resend integration not configured. Go to Integrations to set up your API key.");
    }

    const resendApiKey = integration.config.api_key;
    const fromEmail = integration.config.from_email || "noreply@example.com";

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: body_html || `<p>${body_text || ""}</p>`,
        text: body_text || undefined,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error(`Resend API error: ${resendRes.status} - ${errBody}`);
    }

    const resendData = await resendRes.json();

    // Log activity
    if (contact_id) {
      await supabase.from("activities").insert({
        workspace_id,
        entity_id: contact_id,
        entity_type: "contact",
        activity_type: "email",
        title: `Email sent: ${subject}`,
        description: `Sent to ${to}`,
        metadata: { subject, to, resend_id: resendData.id, deal_id },
        performed_at: new Date().toISOString(),
      });

      // Update contact's last_contact_date
      await supabase
        .from("contacts")
        .update({ last_contact_date: new Date().toISOString() })
        .eq("id", contact_id)
        .eq("workspace_id", workspace_id);
    }

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
