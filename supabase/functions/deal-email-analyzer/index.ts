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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const sb = createClient(supabaseUrl, serviceKey);

    const { workspace_id, mode = "sync" } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get all active deals with their contacts/companies
    const { data: deals } = await sb
      .from("deals")
      .select("id, title, stage, value, company_id, contact_id, notes, expected_close_date")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .not("stage", "in", '("closed_won","closed_lost")');

    if (!deals?.length) {
      return new Response(JSON.stringify({ ok: true, message: "No active deals", analyzed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Collect all contact_ids and company_ids from deals
    const contactIds = [...new Set(deals.map(d => d.contact_id).filter(Boolean))];
    const companyIds = [...new Set(deals.map(d => d.company_id).filter(Boolean))];

    // 3. Get contact emails for matching
    let contactEmails: Record<string, string[]> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await sb
        .from("contacts")
        .select("id, email, secondary_email")
        .in("id", contactIds);
      for (const c of contacts || []) {
        const emails = [c.email, c.secondary_email].filter(Boolean).map((e: string) => e.toLowerCase());
        if (emails.length) contactEmails[c.id] = emails;
      }
    }

    // Get company emails/domains for matching
    let companyDomains: Record<string, string[]> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await sb
        .from("companies")
        .select("id, primary_email, secondary_email, website")
        .in("id", companyIds);
      for (const co of companies || []) {
        const domains: string[] = [];
        for (const field of [co.primary_email, co.secondary_email]) {
          if (field) {
            const domain = field.split("@")[1]?.toLowerCase();
            if (domain) domains.push(domain);
          }
        }
        if (co.website) {
          try {
            const domain = new URL(co.website.startsWith("http") ? co.website : `https://${co.website}`).hostname.replace("www.", "");
            domains.push(domain);
          } catch {}
        }
        if (domains.length) companyDomains[co.id] = [...new Set(domains)];
      }
    }

    // 4. Get already-linked email IDs to avoid re-processing
    const { data: existingLinks } = await sb
      .from("deal_email_context")
      .select("email_id")
      .eq("workspace_id", workspace_id);
    const linkedEmailIds = new Set((existingLinks || []).map(l => l.email_id));

    // 5. For sync mode: get recent emails (last 24h). For daily mode: last 24h batch.
    const lookbackHours = mode === "daily" ? 24 : 6;
    const since = new Date(Date.now() - lookbackHours * 3600000).toISOString();

    const { data: recentEmails } = await sb
      .from("inbox_emails")
      .select("id, from_email, from_name, subject, preview, ai_summary, received_at, contact_id, conversation_id")
      .eq("workspace_id", workspace_id)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(100);

    if (!recentEmails?.length) {
      return new Response(JSON.stringify({ ok: true, message: "No recent emails", analyzed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Match emails to deals
    interface EmailDealMatch {
      email: typeof recentEmails[0];
      deal: typeof deals[0];
      matchReason: string;
    }
    const matches: EmailDealMatch[] = [];

    for (const email of recentEmails) {
      if (linkedEmailIds.has(email.id)) continue;
      const senderEmail = email.from_email?.toLowerCase() || "";
      const senderDomain = senderEmail.split("@")[1] || "";

      for (const deal of deals) {
        let matched = false;
        let reason = "";

        // Match by contact email
        if (deal.contact_id && contactEmails[deal.contact_id]) {
          if (contactEmails[deal.contact_id].includes(senderEmail)) {
            matched = true;
            reason = "contact_email_match";
          }
        }

        // Match by contact_id on email
        if (!matched && email.contact_id && email.contact_id === deal.contact_id) {
          matched = true;
          reason = "contact_id_match";
        }

        // Match by company domain
        if (!matched && deal.company_id && companyDomains[deal.company_id]) {
          if (companyDomains[deal.company_id].includes(senderDomain)) {
            matched = true;
            reason = "company_domain_match";
          }
        }

        if (matched) {
          matches.push({ email, deal, matchReason: reason });
        }
      }
    }

    if (!matches.length) {
      return new Response(JSON.stringify({ ok: true, message: "No new email-deal matches", analyzed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Analyze matches with AI (batch up to 10 at a time)
    let totalContextCreated = 0;
    let totalTasksCreated = 0;
    const batchSize = 10;

    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      if (!openrouterKey) {
        // Fallback: store basic context without AI analysis
        for (const m of batch) {
          await sb.from("deal_email_context").upsert({
            workspace_id,
            deal_id: m.deal.id,
            email_id: m.email.id,
            ai_summary: m.email.ai_summary || m.email.preview?.substring(0, 200),
            deal_stage_signal: null,
            sentiment: "neutral",
            linked_by: "auto",
            action_items: [],
            key_points: [],
          }, { onConflict: "deal_id,email_id" });
          totalContextCreated++;
        }
        continue;
      }

      // Build AI prompt
      const emailsForAI = batch.map((m, idx) => ({
        idx,
        deal_title: m.deal.title,
        deal_stage: m.deal.stage,
        deal_value: m.deal.value,
        expected_close: m.deal.expected_close_date,
        email_subject: m.email.subject,
        email_from: m.email.from_name || m.email.from_email,
        email_preview: (m.email.ai_summary || m.email.preview || "").substring(0, 500),
        email_date: m.email.received_at,
        match_reason: m.matchReason,
      }));

      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-v3.2",
            max_tokens: 2000,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are a CRM intelligence agent. Analyze email-deal pairs and extract actionable insights.

For each email-deal pair, return:
- summary: 1-2 sentence summary of how this email relates to the deal
- key_points: array of key facts/commitments mentioned
- action_items: array of specific tasks that should be done (e.g., "Send proposal by Friday", "Schedule demo call")
- stage_signal: what deal stage this email suggests (null if unclear). Values: "prospecting", "qualification", "proposal", "negotiation", "closing", "stalled"
- sentiment: "positive", "neutral", or "negative"
- task_suggestions: array of objects with {title, description, priority, due_in_days} for tasks to create

Return valid JSON: { "results": [ { "idx": 0, "summary": "...", "key_points": [...], "action_items": [...], "stage_signal": "...", "sentiment": "...", "task_suggestions": [...] } ] }`,
              },
              {
                role: "user",
                content: JSON.stringify(emailsForAI),
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content?.trim();
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch {
            console.error("Failed to parse AI response:", content?.substring(0, 200));
            // Fallback: basic context
            for (const m of batch) {
              await sb.from("deal_email_context").upsert({
                workspace_id,
                deal_id: m.deal.id,
                email_id: m.email.id,
                ai_summary: m.email.ai_summary || m.email.preview?.substring(0, 200),
                linked_by: "auto",
                action_items: [],
                key_points: [],
              }, { onConflict: "deal_id,email_id" });
              totalContextCreated++;
            }
            continue;
          }

          const results = parsed.results || [];
          for (const r of results) {
            const m = batch[r.idx];
            if (!m) continue;

            // Save context
            await sb.from("deal_email_context").upsert({
              workspace_id,
              deal_id: m.deal.id,
              email_id: m.email.id,
              ai_summary: r.summary || m.email.preview?.substring(0, 200),
              action_items: r.action_items || [],
              key_points: r.key_points || [],
              deal_stage_signal: r.stage_signal || null,
              sentiment: r.sentiment || "neutral",
              linked_by: "auto",
            }, { onConflict: "deal_id,email_id" });
            totalContextCreated++;

            // Create task suggestions
            const tasks = r.task_suggestions || [];
            for (const task of tasks) {
              const dueDate = task.due_in_days
                ? new Date(Date.now() + task.due_in_days * 86400000).toISOString().split("T")[0]
                : null;

              await sb.from("deal_email_tasks").insert({
                workspace_id,
                deal_id: m.deal.id,
                email_id: m.email.id,
                task_title: task.title,
                task_description: task.description || null,
                suggested_priority: task.priority || "medium",
                suggested_due_date: dueDate,
                status: "pending",
              });
              totalTasksCreated++;
            }
          }
        } else {
          console.error(`AI error ${aiRes.status}: ${await aiRes.text()}`);
          // Fallback
          for (const m of batch) {
            await sb.from("deal_email_context").upsert({
              workspace_id,
              deal_id: m.deal.id,
              email_id: m.email.id,
              ai_summary: m.email.ai_summary || m.email.preview?.substring(0, 200),
              linked_by: "auto",
              action_items: [],
              key_points: [],
            }, { onConflict: "deal_id,email_id" });
            totalContextCreated++;
          }
        }
      } catch (err) {
        console.error("AI analysis error:", err);
      }
    }

    // 8. Log activity
    if (totalContextCreated > 0 || totalTasksCreated > 0) {
      await sb.from("assistant_actions").insert({
        workspace_id,
        action_type: "deal_email_analysis",
        title: `Analyzed ${totalContextCreated} deal emails, created ${totalTasksCreated} task suggestions`,
        metadata: {
          context_created: totalContextCreated,
          tasks_created: totalTasksCreated,
          mode,
        },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deals_checked: deals.length,
        emails_checked: recentEmails.length,
        matches_found: matches.length,
        context_created: totalContextCreated,
        tasks_created: totalTasksCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    console.error("deal-email-analyzer error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
