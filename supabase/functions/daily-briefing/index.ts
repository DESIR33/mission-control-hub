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

    // Get all workspaces
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
        contactsRes,
        dealsRes,
        videosRes,
        proposalsRes,
        adRevenueRes,
        recentVideosRes,
      ] = await Promise.all([
        sb.from("contacts").select("id, first_name, last_name, status, last_contact_date")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("deals").select("id, title, value, stage, expected_close_date, updated_at")
          .eq("workspace_id", wsId).is("deleted_at", null),
        sb.from("video_queue").select("id, title, status")
          .eq("workspace_id", wsId),
        sb.from("ai_proposals").select("id, title, type")
          .eq("workspace_id", wsId).eq("status", "pending").limit(5),
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
      ]);

      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const videos = videosRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const adRevenue = (adRevenueRes.data ?? []) as any[];
      const recentVideos = (recentVideosRes.data ?? []) as any[];

      // Build context summary
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const staleContacts = contacts.filter(
        (c) => c.last_contact_date && new Date(c.last_contact_date) < sevenDaysAgo
      );

      const openStages = ["prospecting", "qualification", "proposal", "negotiation"];
      const pipelineValue = deals
        .filter((d) => openStages.includes(d.stage))
        .reduce((s, d) => s + (Number(d.value) || 0), 0);

      const monthlyAdRevenue = adRevenue.reduce(
        (s, r) => s + (Number(r.estimated_revenue) || 0), 0
      );
      const monthlyViews = adRevenue.reduce((s, r) => s + (Number(r.views) || 0), 0);
      const monthlySubsGained = adRevenue.reduce(
        (s, r) => s + (Number(r.subscribers_gained) || 0), 0
      );

      const contextSummary = `
Channel Overview (last 30 days):
- Total views: ${monthlyViews.toLocaleString()}
- Subscribers gained: ${monthlySubsGained.toLocaleString()}
- Ad revenue: $${monthlyAdRevenue.toFixed(2)}

Pipeline:
- Open deals: ${deals.filter((d) => openStages.includes(d.stage)).length} worth $${pipelineValue.toLocaleString()}
- Won deals: ${deals.filter((d) => d.stage === "closed_won").length}
- Pending proposals: ${proposals.length}

Content:
- Videos in pipeline: ${videos.filter((v) => ["idea", "scripting", "recording", "editing", "review", "scheduled"].includes(v.status)).length}
- In editing/review: ${videos.filter((v) => ["editing", "review"].includes(v.status)).length}

Contacts:
- Total: ${contacts.length}
- Stale (7+ days no contact): ${staleContacts.length}

Top recent videos (14 days):
${recentVideos.slice(0, 5).map((v: any) => `- "${v.title}": ${v.views} views, ${(Number(v.impressions_ctr) * 100).toFixed(1)}% CTR, +${v.subscribers_gained} subs`).join("\n")}

Deals requiring attention:
${deals.filter((d) => openStages.includes(d.stage)).slice(0, 5).map((d) => `- "${d.title}": ${d.stage}, $${d.value ?? 0}${d.expected_close_date ? `, closes ${d.expected_close_date}` : ""}`).join("\n")}
`.trim();

      let briefingText: string;

      if (openrouterKey) {
        // Use AI to generate briefing
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4-20250514",
            max_tokens: 800,
            messages: [
              {
                role: "system",
                content: `You are a YouTube creator's daily briefing analyst. Generate a concise daily briefing (5-8 bullet points) covering:
1. What's working well (top performing content, revenue wins)
2. What needs attention (stale contacts, approaching deadlines, low CTR videos)
3. Where focus should be today (priority actions)

Be specific with numbers. Use action-oriented language. Format as simple bullet points starting with an emoji indicator:
🟢 for wins/positive insights
🔴 for urgent issues
🟡 for action items
📊 for data insights

Keep each point to 1-2 sentences max.`,
              },
              {
                role: "user",
                content: `Generate today's daily briefing based on this data:\n\n${contextSummary}`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          briefingText = aiData.choices?.[0]?.message?.content ?? contextSummary;
        } else {
          briefingText = contextSummary;
        }
      } else {
        // Fallback: generate structured briefing without AI
        const lines: string[] = [];
        if (monthlyAdRevenue > 0) {
          lines.push(`📊 YouTube ad revenue at $${monthlyAdRevenue.toFixed(0)} this month with ${monthlyViews.toLocaleString()} views.`);
        }
        if (monthlySubsGained > 0) {
          lines.push(`🟢 Gained ${monthlySubsGained.toLocaleString()} subscribers in the last 30 days.`);
        }
        if (staleContacts.length > 0) {
          lines.push(`🔴 ${staleContacts.length} contacts haven't been reached in 7+ days.`);
        }
        if (proposals.length > 0) {
          lines.push(`🟡 ${proposals.length} AI proposals awaiting your review.`);
        }
        if (pipelineValue > 0) {
          lines.push(`📊 Deal pipeline at $${pipelineValue.toLocaleString()}.`);
        }
        const editingCount = videos.filter((v) => ["editing", "review"].includes(v.status)).length;
        if (editingCount > 0) {
          lines.push(`🟡 ${editingCount} videos in editing/review need your sign-off.`);
        }
        briefingText = lines.join("\n");
      }

      // Store briefing as daily log
      await sb.from("assistant_daily_logs").insert({
        workspace_id: wsId,
        content: briefingText,
        source: "daily-briefing",
        log_date: now.toISOString().split("T")[0],
      });

      results.push({ workspace_id: wsId, status: "ok" });
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
