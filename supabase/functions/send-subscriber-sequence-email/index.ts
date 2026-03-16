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

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get Resend config
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "resend")
      .eq("enabled", true)
      .maybeSingle();

    if (!integration?.config?.api_key) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "Resend not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = integration.config.api_key;
    const fromEmail = integration.config.from_email || "noreply@example.com";

    // Get active enrollments due to send
    const { data: enrollments, error: enrollError } = await supabase
      .from("subscriber_sequence_enrollments")
      .select("*, subscriber_sequences(*)")
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString());

    if (enrollError) throw enrollError;

    let processed = 0;

    for (const enrollment of (enrollments || [])) {
      const sequence = enrollment.subscriber_sequences;
      if (!sequence || sequence.status !== "active") continue;

      const steps = sequence.steps || [];
      const currentStep = steps.find((s: any) => s.step_number === enrollment.current_step + 1);
      if (!currentStep) {
        // Sequence complete
        await supabase
          .from("subscriber_sequence_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      // Get subscriber
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("email, first_name")
        .eq("id", enrollment.subscriber_id)
        .single();

      if (!subscriber) continue;

      // Render template
      const subject = (currentStep.subject || "")
        .replace(/\{\{first_name\}\}/g, subscriber.first_name || "there");
      const body = (currentStep.body || "")
        .replace(/\{\{first_name\}\}/g, subscriber.first_name || "there");

      // Send email
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [subscriber.email],
            subject,
            text: body,
          }),
        });

        if (res.ok) {
          // Advance to next step
          const nextStep = steps.find((s: any) => s.step_number === enrollment.current_step + 2);
          const nextSendAt = nextStep
            ? new Date(Date.now() + nextStep.delay_days * 86400000).toISOString()
            : null;

          await supabase
            .from("subscriber_sequence_enrollments")
            .update({
              current_step: enrollment.current_step + 1,
              next_send_at: nextSendAt,
              ...(nextSendAt ? {} : { status: "completed", completed_at: new Date().toISOString() }),
            })
            .eq("id", enrollment.id);

          processed++;
        }
      } catch (err) {
        console.error(`Failed to send sequence email to ${subscriber.email}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
