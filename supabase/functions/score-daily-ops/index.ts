import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

/**
 * Scores and aggregates daily ops items from tasks, proposals, deals, inbox, and content.
 * Writes scored items to ops_daily_items for the dashboard.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const auth = await validateCallerOrServiceRole(req);
    if (!auth.authorized) return auth.response;

    const { workspace_id } = await req.json();
    if (!workspace_id) return errorResponse("workspace_id required", 400);

    const db = getSupabaseAdmin();
    const now = new Date();
    const items: Array<{
      workspace_id: string;
      source_type: string;
      source_id: string;
      title: string;
      subtitle: string | null;
      urgency_score: number;
      urgency_factors: Record<string, unknown>;
      time_block: string;
      due_at: string | null;
      metadata: Record<string, unknown>;
    }> = [];

    // 1. Tasks
    const { data: tasks } = await db
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assigned_to")
      .eq("workspace_id", workspace_id)
      .in("status", ["todo", "in_progress"])
      .limit(50);

    for (const t of tasks ?? []) {
      const factors: Record<string, number> = {};
      let score = 0;

      // Priority weight
      const pw = t.priority === "urgent" ? 40 : t.priority === "high" ? 30 : t.priority === "medium" ? 15 : 5;
      factors.priority = pw;
      score += pw;

      // Due date urgency
      if (t.due_date) {
        const hoursUntilDue = (new Date(t.due_date).getTime() - now.getTime()) / 3600000;
        if (hoursUntilDue < 0) { factors.overdue = 35; score += 35; }
        else if (hoursUntilDue < 4) { factors.due_soon = 25; score += 25; }
        else if (hoursUntilDue < 24) { factors.due_today = 15; score += 15; }
      }

      // In-progress bonus
      if (t.status === "in_progress") { factors.active = 10; score += 10; }

      const timeBlock = score > 60 ? "morning" : score > 30 ? "afternoon" : "evening";

      items.push({
        workspace_id,
        source_type: "task",
        source_id: t.id,
        title: t.title || "Untitled Task",
        subtitle: t.description?.slice(0, 100) || null,
        urgency_score: Math.min(score, 100),
        urgency_factors: factors,
        time_block: timeBlock,
        due_at: t.due_date || null,
        metadata: { status: t.status, priority: t.priority, assigned_to: t.assigned_to },
      });
    }

    // 2. Pending proposals
    const { data: proposals } = await db
      .from("ai_proposals")
      .select("id, title, summary, proposal_type, confidence, created_at, entity_type")
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .limit(30);

    for (const p of proposals ?? []) {
      const factors: Record<string, number> = {};
      let score = 20; // base

      // High confidence = more urgent to review
      if (p.confidence && p.confidence > 0.8) { factors.high_confidence = 20; score += 20; }

      // Age penalty
      const hoursOld = (now.getTime() - new Date(p.created_at).getTime()) / 3600000;
      if (hoursOld > 48) { factors.stale = 15; score += 15; }
      else if (hoursOld > 24) { factors.aging = 10; score += 10; }

      items.push({
        workspace_id,
        source_type: "proposal",
        source_id: p.id,
        title: p.title,
        subtitle: p.summary?.slice(0, 100) || `${p.proposal_type} proposal`,
        urgency_score: Math.min(score, 100),
        urgency_factors: factors,
        time_block: "morning",
        due_at: null,
        metadata: { proposal_type: p.proposal_type, confidence: p.confidence, entity_type: p.entity_type },
      });
    }

    // 3. Deals approaching deadline
    const { data: deals } = await db
      .from("deals")
      .select("id, title, value, stage, expected_close_date, notes, company_id")
      .eq("workspace_id", workspace_id)
      .not("stage", "in", '("won","lost","churned")')
      .limit(30);

    for (const d of deals ?? []) {
      if (!d.expected_close_date) continue;
      const hoursUntil = (new Date(d.expected_close_date).getTime() - now.getTime()) / 3600000;
      if (hoursUntil > 168) continue; // skip if > 7 days out

      const factors: Record<string, number> = {};
      let score = 15;

      if (hoursUntil < 0) { factors.overdue = 30; score += 30; }
      else if (hoursUntil < 24) { factors.closing_today = 25; score += 25; }
      else if (hoursUntil < 72) { factors.closing_soon = 15; score += 15; }

      // Value weight
      const val = Number(d.value) || 0;
      if (val > 5000) { factors.high_value = 15; score += 15; }
      else if (val > 1000) { factors.medium_value = 8; score += 8; }

      items.push({
        workspace_id,
        source_type: "deal",
        source_id: d.id,
        title: d.title || "Untitled Deal",
        subtitle: `$${val.toLocaleString()} · ${d.stage}`,
        urgency_score: Math.min(score, 100),
        urgency_factors: factors,
        time_block: score > 50 ? "morning" : "afternoon",
        due_at: d.expected_close_date,
        metadata: { stage: d.stage, value: val, company_id: d.company_id },
      });
    }

    // 4. Content milestones (video queue items nearing publish date)
    const { data: content } = await db
      .from("video_queue")
      .select("id, title, status, scheduled_date, notes")
      .eq("workspace_id", workspace_id)
      .in("status", ["scripting", "editing", "review", "scheduled"])
      .limit(20);

    for (const c of content ?? []) {
      if (!c.scheduled_date) continue;
      const hoursUntil = (new Date(c.scheduled_date).getTime() - now.getTime()) / 3600000;
      if (hoursUntil > 168) continue;

      const factors: Record<string, number> = {};
      let score = 10;

      if (hoursUntil < 0) { factors.past_schedule = 25; score += 25; }
      else if (hoursUntil < 24) { factors.publish_today = 20; score += 20; }
      else if (hoursUntil < 72) { factors.publish_soon = 12; score += 12; }

      items.push({
        workspace_id,
        source_type: "content",
        source_id: c.id,
        title: c.title || "Untitled Video",
        subtitle: `${c.status} · scheduled ${c.scheduled_date}`,
        urgency_score: Math.min(score, 100),
        urgency_factors: factors,
        time_block: "afternoon",
        due_at: c.scheduled_date,
        metadata: { status: c.status },
      });
    }

    // Upsert all scored items
    if (items.length > 0) {
      // Clear old items no longer relevant
      await db
        .from("ops_daily_items")
        .delete()
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .lt("scored_at", new Date(now.getTime() - 86400000).toISOString());

      const { error: upsertError } = await db
        .from("ops_daily_items")
        .upsert(
          items.map((i) => ({
            ...i,
            status: "pending",
            scored_at: now.toISOString(),
          })),
          { onConflict: "workspace_id,source_type,source_id" }
        );

      if (upsertError) throw upsertError;
    }

    // Fetch learning signals: avg time-to-action by source type
    const { data: learningData } = await db
      .from("ops_completion_outcomes")
      .select("source_type, action_taken, time_to_action_minutes, urgency_score_at_action")
      .eq("workspace_id", workspace_id)
      .order("acted_at", { ascending: false })
      .limit(200);

    const learning: Record<string, { avg_tta: number; count: number }> = {};
    for (const o of learningData ?? []) {
      const k = o.source_type;
      if (!learning[k]) learning[k] = { avg_tta: 0, count: 0 };
      learning[k].count++;
      learning[k].avg_tta += (o.time_to_action_minutes || 0);
    }
    for (const k of Object.keys(learning)) {
      if (learning[k].count > 0) learning[k].avg_tta /= learning[k].count;
    }

    return jsonResponse({
      scored_count: items.length,
      by_type: {
        tasks: items.filter(i => i.source_type === "task").length,
        proposals: items.filter(i => i.source_type === "proposal").length,
        deals: items.filter(i => i.source_type === "deal").length,
        content: items.filter(i => i.source_type === "content").length,
      },
      learning_signals: learning,
    });
  } catch (err) {
    return errorResponse(err, 500);
  }
});
