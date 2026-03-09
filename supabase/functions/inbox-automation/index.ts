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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all workspaces that have Outlook connected
    const { data: integrations } = await supabase
      .from("workspace_integrations")
      .select("workspace_id")
      .eq("integration_key", "ms_outlook")
      .eq("enabled", true);

    if (!integrations?.length) {
      return new Response(JSON.stringify({ message: "No workspaces to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0;

    for (const integration of integrations) {
      const wsId = integration.workspace_id;

      // 1. Un-snooze emails that have passed their snooze time
      const now = new Date().toISOString();
      const { data: snoozedEmails } = await supabase
        .from("inbox_emails")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("folder", "snoozed")
        .not("snoozed_until", "is", null)
        .lte("snoozed_until", now);

      if (snoozedEmails?.length) {
        await supabase
          .from("inbox_emails")
          .update({ folder: "inbox", snoozed_until: null })
          .in("id", snoozedEmails.map((e: any) => e.id));
        console.log(`Un-snoozed ${snoozedEmails.length} emails for workspace ${wsId}`);
      }

      // 2. Auto-detect follow-ups needed (sent emails with no reply after 48h)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: sentEmails } = await supabase
        .from("inbox_emails")
        .select("id, message_id, to_recipients, subject, from_email")
        .eq("workspace_id", wsId)
        .eq("folder", "sent")
        .lt("received_at", twoDaysAgo)
        .order("received_at", { ascending: false })
        .limit(100);

      if (sentEmails?.length) {
        for (const sent of sentEmails) {
          const recipients = (sent.to_recipients as any[] || []);
          const recipientEmails = recipients.map((r: any) => r.email).filter(Boolean);
          
          if (recipientEmails.length === 0) continue;

          // Check if any reply exists from those recipients
          const { count } = await supabase
            .from("inbox_emails")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", wsId)
            .eq("folder", "inbox")
            .in("from_email", recipientEmails)
            .ilike("subject", `%${(sent.subject || "").replace(/^(Re:|Fwd:)\s*/gi, "").slice(0, 50)}%`);

          if ((count ?? 0) === 0) {
            // Check if follow-up already exists
            const { count: existingCount } = await supabase
              .from("email_follow_ups")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", wsId)
              .eq("email_id", sent.id);

            if ((existingCount ?? 0) === 0) {
              await supabase.from("email_follow_ups").insert({
                workspace_id: wsId,
                email_id: sent.id,
                reason: "no_reply",
                priority: "medium",
                suggested_action: `Follow up on: "${sent.subject}"`,
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              });
              totalCreated++;
            }
          }
        }
      }

      // 3. Auto-archive low-priority P4 emails older than 7 days that are read
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldP4Emails } = await supabase
        .from("inbox_emails")
        .select("id, from_email")
        .eq("workspace_id", wsId)
        .eq("folder", "inbox")
        .eq("is_read", true)
        .lt("received_at", sevenDaysAgo);

      // We can't filter by priority directly (it's computed), so we need to get contacts
      // For simplicity, we'll just auto-archive read emails from unknown senders after 7 days
      // by checking if from_email is NOT in contacts
      if (oldP4Emails?.length) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("email")
          .eq("workspace_id", wsId)
          .not("email", "is", null);

        const contactEmails = new Set((contacts ?? []).map((c: any) => c.email?.toLowerCase()));
        const toArchive = oldP4Emails
          .filter((e: any) => !contactEmails.has(e.from_email?.toLowerCase()))
          .map((e: any) => e.id);

        if (toArchive.length > 0) {
          await supabase
            .from("inbox_emails")
            .update({ folder: "archive" })
            .in("id", toArchive);
          console.log(`Auto-archived ${toArchive.length} old read emails from unknown senders`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, follow_ups_created: totalCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("inbox-automation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
