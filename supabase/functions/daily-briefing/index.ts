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
      ] = await Promise.all([
        sb.from("contacts").select("id, first_name, last_name, status, last_contact_date")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("deals").select("id, title, value, stage, expected_close_date, updated_at")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("video_queue").select("id, title, status, scheduled_date")
          .eq("workspace_id", wsId),
        sb.from("ai_proposals").select("id, title, type, proposal_type")
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
          .eq("workspace_id", wsId).in("status", ["todo", "in_progress"]).limit(20),
        sb.from("inbox_emails").select("id, subject, ai_priority, ai_category")
          .eq("workspace_id", wsId).eq("ai_priority", "P1").is("read_at", null).limit(10),
      ]);

      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const videos = videosRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const adRevenue = (adRevenueRes.data ?? []) as any[];
      const recentVideos = (recentVideosRes.data ?? []) as any[];
      const openTasks = (tasksRes.data ?? []) as any[];
      const urgentEmails = (emailsRes.data ?? []) as any[];

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
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

      const overdueTasks = openTasks.filter(
        (t: any) => t.due_date && new Date(t.due_date) < now
      );

      const contextSummary = `
Channel Overview (last 30 days):
- Total views: ${monthlyViews.toLocaleString()}
- Subscribers gained: ${monthlySubsGained.toLocaleString()}
- Ad revenue: $${monthlyAdRevenue.toFixed(2)}

Pipeline:
- Open deals: ${deals.filter((d) => openStages.includes(d.stage)).length} worth $${pipelineValue.toLocaleString()}
- Approaching deadlines (7 days): ${approachingDeals.length} deals
${approachingDeals.map(d => `  - "${d.title}" closes ${d.expected_close_date}`).join("\n")}

Content:
- Videos in pipeline: ${videos.filter((v) => ["idea", "scripting", "recording", "editing", "review", "scheduled"].includes(v.status)).length}
- In editing/review: ${videos.filter((v) => ["editing", "review"].includes(v.status)).length}

Contacts:
- Total: ${contacts.length}
- Stale (7+ days no contact): ${staleContacts.length}

Tasks:
- Open tasks: ${openTasks.length}
- Overdue tasks: ${overdueTasks.length}
${overdueTasks.slice(0, 5).map((t: any) => `  - "${t.title}" (${t.priority})`).join("\n")}

Urgent emails: ${urgentEmails.length} P1 emails awaiting response
${urgentEmails.slice(0, 3).map((e: any) => `  - "${e.subject}" (${e.ai_category})`).join("\n")}

Pending AI proposals: ${proposals.length}

Top recent videos (14 days):
${recentVideos.slice(0, 5).map((v: any) => `- "${v.title}": ${v.views} views, ${(Number(v.impressions_ctr) * 100).toFixed(1)}% CTR`).join("\n")}
`.trim();

      let briefingText: string;
      const tasksTodo: Array<{ title: string; priority: string; category: string; due_date?: string; entity_type?: string; entity_id?: string }> = [];

      if (openrouterKey) {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3.5-sonnet",
            max_tokens: 1200,
            messages: [
              {
                role: "system",
                content: `You are a YouTube creator's executive assistant. Generate a daily briefing with TWO sections:

## BRIEFING (5-8 bullet points)
Cover what's working, what needs attention, and today's priorities. Use emoji indicators:
🟢 wins | 🔴 urgent | 🟡 action items | 📊 data insights

## ACTION ITEMS (3-6 tasks)
Generate specific, actionable tasks the user should do today. Return them as a JSON array after the briefing text, wrapped in <tasks> tags:
<tasks>[{"title": "Follow up with [name] about [deal]", "priority": "high", "category": "crm"}, ...]</tasks>

Task categories: crm, content, revenue, email, general
Priorities: urgent, high, medium, low

Be specific with names and numbers. Action-oriented language.`,
              },
              {
                role: "user",
                content: `Generate today's briefing and action items:\n\n${contextSummary}`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const fullResponse = aiData.choices?.[0]?.message?.content ?? contextSummary;
          
          // Extract tasks from response
          const tasksMatch = fullResponse.match(/<tasks>([\s\S]*?)<\/tasks>/);
          if (tasksMatch) {
            try {
              const parsed = JSON.parse(tasksMatch[1]);
              tasksTodo.push(...parsed);
            } catch { /* ignore parse errors */ }
            briefingText = fullResponse.replace(/<tasks>[\s\S]*?<\/tasks>/, "").trim();
          } else {
            briefingText = fullResponse;
          }
        } else {
          briefingText = contextSummary;
        }
      } else {
        // Fallback structured briefing
        const lines: string[] = [];
        if (monthlyAdRevenue > 0) lines.push(`📊 YouTube ad revenue at $${monthlyAdRevenue.toFixed(0)} this month.`);
        if (monthlySubsGained > 0) lines.push(`🟢 Gained ${monthlySubsGained.toLocaleString()} subscribers in 30 days.`);
        if (staleContacts.length > 0) lines.push(`🔴 ${staleContacts.length} contacts haven't been reached in 7+ days.`);
        if (overdueTasks.length > 0) lines.push(`🔴 ${overdueTasks.length} overdue tasks need attention.`);
        if (urgentEmails.length > 0) lines.push(`🔴 ${urgentEmails.length} P1 emails need a response.`);
        if (approachingDeals.length > 0) lines.push(`🟡 ${approachingDeals.length} deals closing within 7 days.`);
        if (proposals.length > 0) lines.push(`🟡 ${proposals.length} AI proposals awaiting review.`);
        if (pipelineValue > 0) lines.push(`📊 Deal pipeline at $${pipelineValue.toLocaleString()}.`);
        briefingText = lines.join("\n");

        // Auto-generate tasks from signals
        if (overdueTasks.length > 0) tasksTodo.push({ title: "Review and clear overdue tasks", priority: "high", category: "general" });
        if (urgentEmails.length > 0) tasksTodo.push({ title: "Respond to urgent P1 emails", priority: "urgent", category: "email" });
        for (const deal of approachingDeals.slice(0, 3)) {
          tasksTodo.push({ title: `Prepare for closing: ${deal.title}`, priority: "high", category: "crm", entity_type: "deal", entity_id: deal.id });
        }
        if (staleContacts.length > 3) tasksTodo.push({ title: `Follow up with ${staleContacts.length} stale contacts`, priority: "medium", category: "crm" });
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
