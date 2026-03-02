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

    // Get Resend integration config
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "resend")
      .eq("enabled", true)
      .single();

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
      .from("email_sequence_enrollments")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString());

    if (enrollError) throw enrollError;
    if (!enrollments?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No enrollments due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const enrollment of enrollments) {
      try {
        // Get sequence with steps
        const { data: sequence } = await supabase
          .from("email_sequences")
          .select("*")
          .eq("id", enrollment.sequence_id)
          .single();

        if (!sequence || sequence.status !== "active") continue;

        const steps = sequence.steps as Array<{
          step_number: number;
          delay_days: number;
          subject_template: string;
          body_template: string;
        }>;

        const currentStep = steps.find(
          (s) => s.step_number === enrollment.current_step
        );
        if (!currentStep) {
          // No more steps — mark completed
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              next_send_at: null,
            })
            .eq("id", enrollment.id);
          continue;
        }

        // Get contact details for merge fields
        const { data: contact } = await supabase
          .from("contacts")
          .select("first_name, last_name, email, company_id")
          .eq("id", enrollment.contact_id)
          .single();

        if (!contact?.email) {
          errors.push(`Contact ${enrollment.contact_id} has no email`);
          continue;
        }

        // Get company name if linked
        let companyName = "";
        if (contact.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", contact.company_id)
            .single();
          companyName = company?.name ?? "";
        }

        // Replace merge fields
        const mergeFields: Record<string, string> = {
          "{{first_name}}": contact.first_name || "",
          "{{last_name}}": contact.last_name || "",
          "{{company_name}}": companyName,
          "{{email}}": contact.email,
        };

        let subject = currentStep.subject_template;
        let bodyHtml = currentStep.body_template;

        for (const [placeholder, value] of Object.entries(mergeFields)) {
          subject = subject.replaceAll(placeholder, value);
          bodyHtml = bodyHtml.replaceAll(placeholder, value);
        }

        // Wrap body in basic HTML if not already
        if (!bodyHtml.includes("<")) {
          bodyHtml = `<div style="font-family:sans-serif;line-height:1.6">${bodyHtml.replace(/\n/g, "<br/>")}</div>`;
        }

        // Send via Resend API
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [contact.email],
            subject,
            html: bodyHtml,
          }),
        });

        let resendId = null;
        if (resendRes.ok) {
          const resendData = await resendRes.json();
          resendId = resendData.id;
        } else {
          const errBody = await resendRes.text();
          errors.push(`Resend error for ${contact.email}: ${errBody}`);

          // Log failure
          await supabase.from("sequence_send_log").insert({
            workspace_id,
            enrollment_id: enrollment.id,
            sequence_id: enrollment.sequence_id,
            contact_id: enrollment.contact_id,
            step_number: currentStep.step_number,
            subject,
            to_email: contact.email,
            status: "failed",
            error_message: errBody,
          });
          continue;
        }

        // Log successful send
        await supabase.from("sequence_send_log").insert({
          workspace_id,
          enrollment_id: enrollment.id,
          sequence_id: enrollment.sequence_id,
          contact_id: enrollment.contact_id,
          step_number: currentStep.step_number,
          subject,
          to_email: contact.email,
          resend_id: resendId,
          status: "sent",
        });

        // Log sequence step event
        await supabase.from("sequence_step_events").insert({
          workspace_id,
          enrollment_id: enrollment.id,
          step_number: currentStep.step_number,
          event_type: "sent",
          occurred_at: new Date().toISOString(),
          metadata: { resend_id: resendId, subject },
        });

        // Advance enrollment to next step
        const nextStepNum = currentStep.step_number + 1;
        const nextStep = steps.find((s) => s.step_number === nextStepNum);

        if (nextStep) {
          const nextSendAt = new Date(
            Date.now() + nextStep.delay_days * 24 * 60 * 60 * 1000
          ).toISOString();

          await supabase
            .from("email_sequence_enrollments")
            .update({
              current_step: nextStepNum,
              next_send_at: nextSendAt,
            })
            .eq("id", enrollment.id);
        } else {
          // No more steps — mark completed
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              next_send_at: null,
            })
            .eq("id", enrollment.id);
        }

        // Log activity on contact
        await supabase.from("activities").insert({
          workspace_id,
          entity_id: enrollment.contact_id,
          entity_type: "contact",
          activity_type: "email",
          title: `Sequence email sent: ${subject}`,
          description: `Step ${currentStep.step_number + 1} of "${sequence.name}" sent to ${contact.email}`,
          metadata: {
            sequence_id: enrollment.sequence_id,
            sequence_name: sequence.name,
            step_number: currentStep.step_number,
            resend_id: resendId,
          },
          performed_at: new Date().toISOString(),
        });

        // Update contact's last_contact_date
        await supabase
          .from("contacts")
          .update({ last_contact_date: new Date().toISOString() })
          .eq("id", enrollment.contact_id)
          .eq("workspace_id", workspace_id);

        processed++;
      } catch (err) {
        errors.push(`Enrollment ${enrollment.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
