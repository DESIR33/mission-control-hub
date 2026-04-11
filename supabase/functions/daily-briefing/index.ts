import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { data: workspaces } = await sb.from("workspaces").select("id");
    if (!workspaces?.length) {
      return new Response(JSON.stringify({ ok: true, message: "No workspaces" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const ws of workspaces) {
      const wsId = ws.id;

      // Gather context data in parallel
      const [
        contactsRes, dealsRes, videosRes, proposalsRes,
        adRevenueRes, recentVideosRes, tasksRes, emailsRes,
        expensesRes, dealEmailContextRes, dealEmailTasksRes,
      ] = await Promise.all([
        sb.from("contacts").select("id, first_name, last_name, status, last_contact_date, company_id")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("deals").select("id, title, value, stage, expected_close_date, updated_at")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("video_queue").select("id, title, status, scheduled_date")
          .eq("workspace_id", wsId),
        sb.from("ai_proposals").select("id, title, type, proposal_type, confidence")
          .eq("workspace_id", wsId).eq("status", "pending").limit(10),
        sb.from("youtube_channel_analytics")
          .select("date, estimated_revenue, views, subscribers_gained")
          .eq("workspace_id", wsId)
          .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
          .order("date", { ascending: false }),
        sb.from("youtube_video_analytics")
          .select("title, views, impressions_ctr, subscribers_gained, estimated_revenue")
          .eq("workspace_id", wsId)
          .gte("date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0])
          .order("views", { ascending: false })
          .limit(10),
        sb.from("tasks").select("id, title, status, priority, due_date")
          .eq("workspace_id", wsId).in("status", ["todo", "in_progress"]).limit(50),
        sb.from("inbox_emails").select("id, subject, ai_priority, ai_category, sender_email")
          .eq("workspace_id", wsId).eq("ai_priority", "P1").is("read_at", null).limit(10),
        sb.from("expenses").select("id, title, amount, date")
          .eq("workspace_id", wsId)
          .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),
        sb.from("deal_email_context")
          .select("deal_id, ai_summary, deal_stage_signal, sentiment, action_items, key_points")
          .eq("workspace_id", wsId)
          .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
        sb.from("deal_email_tasks")
          .select("deal_id, task_title, suggested_priority, status")
          .eq("workspace_id", wsId)
          .eq("status", "pending")
          .limit(15),
      ]);

      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const videos = videosRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const adRevenue = (adRevenueRes.data ?? []) as any[];
      const recentVideos = (recentVideosRes.data ?? []) as any[];
      const openTasks = (tasksRes.data ?? []) as any[];
      const urgentEmails = (emailsRes.data ?? []) as any[];
      const expenses = (expensesRes.data ?? []) as any[];
      const dealEmailContext = (dealEmailContextRes.data ?? []) as any[];
      const pendingDealTasks = (dealEmailTasksRes.data ?? []) as any[];

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
      const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000);

      const staleContacts = contacts.filter(
        (c) => c.last_contact_date && new Date(c.last_contact_date) < sevenDaysAgo
      );

      const openStages = ["prospecting", "qualification", "proposal", "negotiation"];
      const pipelineValue = deals
        .filter((d) => openStages.includes(d.stage))
        .reduce((s, d) => s + (Number(d.value) || 0), 0);

      const monthlyAdRevenue = adRevenue.reduce((s, r) => s + (Number(r.estimated_revenue) || 0), 0);
      const monthlyViews = adRevenue.reduce((s, r) => s + (Number(r.views) || 0), 0);
      const monthlySubsGained = adRevenue.reduce((s, r) => s + (Number(r.subscribers_gained) || 0), 0);

      const approachingDeals = deals.filter(
        (d) => openStages.includes(d.stage) && d.expected_close_date &&
        new Date(d.expected_close_date) <= sevenDaysAhead && new Date(d.expected_close_date) >= now
      );

      const staleDeals = deals.filter(
        (d) => openStages.includes(d.stage) && d.updated_at && new Date(d.updated_at) < fiveDaysAgo
      );

      const overdueTasks = openTasks.filter(
        (t: any) => t.due_date && new Date(t.due_date) < now
      );

      const highPriorityTasks = openTasks.filter(
        (t: any) => t.priority === "urgent" || t.priority === "high"
      );

      const monthlyExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      // Build a structured context for AI
      const contextSummary = `
Channel Overview (last 30 days):
- Total views: ${monthlyViews.toLocaleString()}
- Subscribers gained: ${monthlySubsGained.toLocaleString()}
- Ad revenue: $${monthlyAdRevenue.toFixed(2)}

Pipeline:
- Open deals: ${deals.filter((d) => openStages.includes(d.stage)).length} worth $${pipelineValue.toLocaleString()}
- Approaching deadlines (7 days): ${approachingDeals.length} deals
${approachingDeals.map(d => `  - "${d.title}" closes ${d.expected_close_date} (value: $${d.value || 0})`).join("\n")}
- Stale deals (no update in 5+ days): ${staleDeals.length}
${staleDeals.slice(0, 5).map(d => `  - "${d.title}" last updated ${d.updated_at}`).join("\n")}

Content:
- Videos in pipeline: ${videos.filter((v) => ["idea", "scripting", "recording", "editing", "review", "scheduled"].includes(v.status)).length}
- In editing/review: ${videos.filter((v) => ["editing", "review"].includes(v.status)).length}

Contacts:
- Total: ${contacts.length}
- Stale (7+ days no contact): ${staleContacts.length}
${staleContacts.slice(0, 5).map(c => `  - ${c.first_name} ${c.last_name || ''} (last: ${c.last_contact_date})`).join("\n")}

Tasks:
- Open tasks: ${openTasks.length}
- Overdue tasks: ${overdueTasks.length}
${overdueTasks.slice(0, 5).map((t: any) => `  - "${t.title}" (${t.priority}) due ${t.due_date}`).join("\n")}
- High priority tasks: ${highPriorityTasks.length}
${highPriorityTasks.slice(0, 5).map((t: any) => `  - "${t.title}" (${t.priority})`).join("\n")}
- Tasks due in the next 7 days: ${openTasks.filter((t: any) => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= sevenDaysAhead).length}
${openTasks.filter((t: any) => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= sevenDaysAhead).slice(0, 8).map((t: any) => `  - "${t.title}" (${t.priority}) due ${t.due_date}`).join("\n")}

Urgent emails: ${urgentEmails.length} P1 emails awaiting response
${urgentEmails.slice(0, 3).map((e: any) => `  - "${e.subject}" from ${e.sender_email}`).join("\n")}

Pending AI proposals: ${proposals.length}
${proposals.slice(0, 5).map(p => `  - "${p.title}" (${p.proposal_type}, confidence: ${p.confidence})`).join("\n")}

Monthly expenses: $${monthlyExpenses.toFixed(2)} across ${expenses.length} records

Deal Email Intelligence (last 24h):
- New email-deal connections: ${dealEmailContext.length}
${dealEmailContext.slice(0, 8).map((ctx: any) => {
  const dealTitle = deals.find(d => d.id === ctx.deal_id)?.title || "Unknown deal";
  return `  - "${dealTitle}": ${ctx.ai_summary || "No summary"} [${ctx.sentiment || "neutral"}]${ctx.deal_stage_signal ? ` → stage signal: ${ctx.deal_stage_signal}` : ""}`;
}).join("\n")}
- Pending deal-related tasks: ${pendingDealTasks.length}
${pendingDealTasks.slice(0, 5).map((t: any) => {
  const dealTitle = deals.find(d => d.id === t.deal_id)?.title || "Unknown deal";
  return `  - "${t.task_title}" for "${dealTitle}" (${t.suggested_priority})`;
}).join("\n")}

Top recent videos (14 days):
${recentVideos.slice(0, 5).map((v: any) => `- "${v.title}": ${v.views} views, ${(Number(v.impressions_ctr) * 100).toFixed(1)}% CTR, $${Number(v.estimated_revenue || 0).toFixed(2)} revenue`).join("\n")}
`.trim();

      let briefingText: string;
      const tasksTodo: Array<{ title: string; priority: string; category: string; due_date?: string; entity_type?: string; entity_id?: string }> = [];

      // Always generate a structured fallback first — this guarantees we never store raw stats
      const fallbackLines: string[] = [];

      // Wins
      if (monthlyAdRevenue > 0) fallbackLines.push(`🟢 YouTube ad revenue at $${monthlyAdRevenue.toFixed(0)} this month across ${monthlyViews.toLocaleString()} views.`);
      if (monthlySubsGained > 0) fallbackLines.push(`🟢 Gained ${monthlySubsGained.toLocaleString()} subscribers in the last 30 days.`);
      if (pipelineValue > 0) fallbackLines.push(`📊 Deal pipeline at $${pipelineValue.toLocaleString()} across ${deals.filter(d => openStages.includes(d.stage)).length} open deals.`);

      // Best performing video
      if (recentVideos.length > 0) {
        const top = recentVideos[0] as any;
        fallbackLines.push(`📊 Top video "${top.title}" hit ${Number(top.views).toLocaleString()} views in 14 days.`);
      }

      // Urgent / Actions
      if (overdueTasks.length > 0) fallbackLines.push(`🔴 ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need${overdueTasks.length === 1 ? 's' : ''} immediate attention.`);
      if (urgentEmails.length > 0) fallbackLines.push(`🔴 ${urgentEmails.length} P1 email${urgentEmails.length > 1 ? 's' : ''} awaiting your response.`);
      if (staleContacts.length > 0) fallbackLines.push(`🟡 ${staleContacts.length} contact${staleContacts.length > 1 ? 's' : ''} haven't been reached in 7+ days — follow up to keep relationships warm.`);
      if (staleDeals.length > 0) fallbackLines.push(`🟡 ${staleDeals.length} deal${staleDeals.length > 1 ? 's' : ''} stalling with no activity in 5+ days.`);
      if (approachingDeals.length > 0) {
        for (const d of approachingDeals.slice(0, 2)) {
          fallbackLines.push(`🔴 Deal "${d.title}" ($${d.value || 0}) closing by ${d.expected_close_date} — prepare for close.`);
        }
      }
      if (proposals.length > 0) fallbackLines.push(`🟡 ${proposals.length} AI proposal${proposals.length > 1 ? 's' : ''} awaiting your review.`);
      if (highPriorityTasks.length > 0) fallbackLines.push(`🟡 ${highPriorityTasks.length} high-priority task${highPriorityTasks.length > 1 ? 's' : ''} on your plate today.`);

      // Content pipeline
      const editingCount = videos.filter(v => ["editing", "review"].includes(v.status)).length;
      if (editingCount > 0) fallbackLines.push(`🟡 ${editingCount} video${editingCount > 1 ? 's' : ''} in editing/review — ready for sign-off.`);

      // Monthly expenses
      if (monthlyExpenses > 0) fallbackLines.push(`📊 $${monthlyExpenses.toFixed(0)} in expenses this month.`);

      // If nothing noteworthy, add a positive note
      if (fallbackLines.length === 0) {
        fallbackLines.push(`🟢 All systems running smoothly — no urgent items today.`);
      }

      const structuredFallback = fallbackLines.slice(0, 8).join("\n");

      // Auto-generate tasks from signals for fallback
      if (overdueTasks.length > 0) tasksTodo.push({ title: "Review and clear overdue tasks", priority: "high", category: "general" });
      if (urgentEmails.length > 0) tasksTodo.push({ title: "Respond to urgent P1 emails", priority: "urgent", category: "email" });
      for (const deal of approachingDeals.slice(0, 3)) {
        tasksTodo.push({ title: `Prepare for closing: ${deal.title}`, priority: "high", category: "crm", entity_type: "deal", entity_id: deal.id });
      }
      for (const deal of staleDeals.slice(0, 2)) {
        tasksTodo.push({ title: `Follow up on stale deal: ${deal.title}`, priority: "medium", category: "crm", entity_type: "deal", entity_id: deal.id });
      }
      if (staleContacts.length > 0) {
        const contactNames = staleContacts.slice(0, 3).map(c => c.first_name).join(", ");
        tasksTodo.push({ title: `Follow up with stale contacts: ${contactNames}`, priority: "medium", category: "crm" });
      }
      if (proposals.length > 0) tasksTodo.push({ title: `Review ${proposals.length} pending AI proposals`, priority: "medium", category: "general" });

      if (openrouterKey) {
        try {
          const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "anthropic/claude-sonnet-4",
              max_tokens: 1200,
              messages: [
                {
                  role: "system",
                  content: `You are a YouTube creator's executive assistant. Generate a concise daily briefing as 5-8 bullet points.

Each bullet MUST start with one of these emoji indicators:
🟢 for wins and positive metrics
🔴 for urgent items needing immediate action
🟡 for action items and things to address today
📊 for data insights and trends

Rules:
- Be specific: use real names, numbers, and dollar amounts from the data
- Be actionable: tell the user WHAT to do, not just what's happening
- Prioritize: lead with the most urgent/impactful items
- Be concise: one line per bullet, no sub-bullets
- Focus on what changed or needs action — skip "all clear" stats
- If a deal is stalling, name it. If a contact needs follow-up, name them.
- If there are overdue tasks, mention them. If videos need review, say so.

Return ONLY the bullet points, one per line. No headers, no sections, no markdown.`,
                },
                {
                  role: "user",
                  content: `Generate today's briefing based on this data:\n\n${contextSummary}`,
                },
              ],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiContent = aiData.choices?.[0]?.message?.content?.trim();
            if (aiContent && aiContent.length > 20) {
              briefingText = aiContent;
            } else {
              console.warn("AI returned empty/short response, using fallback");
              briefingText = structuredFallback;
            }
          } else {
            const errBody = await aiRes.text();
            console.error(`OpenRouter API error ${aiRes.status}: ${errBody}`);
            briefingText = structuredFallback;
          }
        } catch (aiErr) {
          console.error("AI briefing generation failed:", aiErr);
          briefingText = structuredFallback;
        }
      } else {
        briefingText = structuredFallback;
      }

      // Store briefing
      await sb.from("assistant_daily_logs").insert({
        workspace_id: wsId,
        content: briefingText,
        source: "daily-briefing",
        log_date: now.toISOString().split("T")[0],
      });

      // Create tasks as proposals (propose-first approach)
      let tasksCreated = 0;
      for (const task of tasksTodo) {
        await sb.from("ai_proposals").insert({
          workspace_id: wsId,
          title: task.title,
          summary: `Daily briefing suggested task: ${task.title}`,
          proposal_type: "enrichment",
          entity_type: task.entity_type || null,
          entity_id: task.entity_id || null,
          proposed_changes: {
            action: "create_task",
            task_priority: task.priority,
            task_category: task.category,
            due_date: task.due_date || now.toISOString().split("T")[0],
          },
          confidence: 0.7,
          status: "pending",
          type: "assistant",
        });
        tasksCreated++;
      }

      // Log the briefing action
      await sb.from("assistant_actions").insert({
        workspace_id: wsId,
        action_type: "daily_briefing",
        title: `Daily briefing generated with ${tasksCreated} action items`,
        description: briefingText.substring(0, 500),
        metadata: { tasks_proposed: tasksCreated },
      });

      results.push({ workspace_id: wsId, status: "ok", tasks_proposed: tasksCreated });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
