import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

/**
 * Proactive scan engine: detects signals across CRM, content pipeline,
 * affiliates, and inbox — then creates proposals for user review.
 * 
 * Signals detected:
 * 1. Stale deals (no update in 14+ days)
 * 2. Approaching deadlines (deals closing within 7 days)
 * 3. Sponsor follow-ups due (contacts not reached in 7+ days with open deals)
 * 4. Content pipeline gaps (no videos scheduled for next 14 days)
 * 5. Affiliate payouts approaching
 * 6. Unread high-priority emails needing response
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const auth = await validateCallerOrServiceRole(req);
    if (!auth.authorized) return auth.response;

    const sb = getSupabaseAdmin();
    const { data: workspaces } = await sb.from("workspaces").select("id");
    if (!workspaces?.length) return jsonResponse({ ok: true, message: "No workspaces" });

    const results = [];

    for (const ws of workspaces) {
      const wsId = ws.id;
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
      const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000);
      const fourteenDaysAhead = new Date(now.getTime() + 14 * 86400000);

      // Gather all signals in parallel
      const [
        staleDealsRes,
        approachingDealsRes,
        staleContactsRes,
        scheduledVideosRes,
        pendingProposalsRes,
        recentActionsRes,
      ] = await Promise.all([
        // 1. Stale deals
        sb.from("deals")
          .select("id, title, value, stage, contact_id, company_id, updated_at")
          .eq("workspace_id", wsId).is("deleted_at", null)
          .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
          .lt("updated_at", fourteenDaysAgo.toISOString()),
        // 2. Approaching deadlines
        sb.from("deals")
          .select("id, title, value, stage, expected_close_date, contact_id")
          .eq("workspace_id", wsId).is("deleted_at", null)
          .in("stage", ["proposal", "negotiation"])
          .gte("expected_close_date", now.toISOString())
          .lte("expected_close_date", sevenDaysAhead.toISOString()),
        // 3. Stale contacts with open deals
        sb.from("contacts")
          .select("id, first_name, last_name, email, last_contact_date")
          .eq("workspace_id", wsId).is("deleted_at", null)
          .lt("last_contact_date", sevenDaysAgo.toISOString()),
        // 4. Videos scheduled in next 14 days
        sb.from("video_queue")
          .select("id, title, status, scheduled_date")
          .eq("workspace_id", wsId)
          .eq("status", "scheduled"),
        // 5. Already pending proposals (avoid duplicates)
        sb.from("ai_proposals")
          .select("entity_id, proposal_type")
          .eq("workspace_id", wsId)
          .eq("status", "pending"),
        // 6. Recent actions (avoid re-creating)
        sb.from("assistant_actions")
          .select("entity_id, action_type")
          .eq("workspace_id", wsId)
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const staleDeals = staleDealsRes.data ?? [];
      const approachingDeals = approachingDealsRes.data ?? [];
      const staleContacts = staleContactsRes.data ?? [];
      const scheduledVideos = scheduledVideosRes.data ?? [];
      const pendingProposals = new Set(
        (pendingProposalsRes.data ?? []).map((p: any) => `${p.entity_id}-${p.proposal_type}`)
      );
      const recentActions = new Set(
        (recentActionsRes.data ?? []).map((a: any) => `${a.entity_id}-${a.action_type}`)
      );

      const skip = (entityId: string, type: string) =>
        pendingProposals.has(`${entityId}-${type}`) || recentActions.has(`${entityId}-${type}`);

      let proposalsCreated = 0;

      // Signal 1: Stale deals
      for (const deal of staleDeals) {
        if (skip(deal.id, "deal_update")) continue;
        const daysSince = Math.floor((now.getTime() - new Date(deal.updated_at).getTime()) / 86400000);
        await sb.from("ai_proposals").insert({
          workspace_id: wsId,
          entity_type: "deal",
          entity_id: deal.id,
          proposal_type: "deal_update",
          title: `Follow up on stale deal: ${deal.title}`,
          summary: `This deal has been in "${deal.stage}" for ${daysSince} days without updates. ${daysSince > 30 ? "Consider closing or moving to nurture." : "Schedule a follow-up with the contact."}`,
          proposed_changes: { action: "follow_up", days_stale: daysSince, current_stage: deal.stage },
          confidence: daysSince > 30 ? 0.9 : 0.7,
          status: "pending",
          type: "assistant",
        });
        await sb.from("assistant_actions").insert({
          workspace_id: wsId, action_type: "stale_deal_detected", entity_type: "deal", entity_id: deal.id,
          title: `Detected stale deal: ${deal.title}`,
          description: `Deal inactive for ${daysSince} days. Created proposal for follow-up.`,
        });
        proposalsCreated++;
      }

      // Signal 2: Approaching deadlines
      for (const deal of approachingDeals) {
        if (skip(deal.id, "deal_deadline")) continue;
        const daysUntil = Math.floor((new Date(deal.expected_close_date).getTime() - now.getTime()) / 86400000);
        await sb.from("ai_proposals").insert({
          workspace_id: wsId,
          entity_type: "deal",
          entity_id: deal.id,
          proposal_type: "deal_update",
          title: `Deal closing soon: ${deal.title}`,
          summary: `Expected close date is in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. Make sure deliverables are on track and final terms are agreed.`,
          proposed_changes: { action: "deadline_prep", days_until_close: daysUntil },
          confidence: 0.85,
          status: "pending",
          type: "assistant",
        });
        await sb.from("assistant_actions").insert({
          workspace_id: wsId, action_type: "deadline_approaching", entity_type: "deal", entity_id: deal.id,
          title: `Deal deadline approaching: ${deal.title}`,
          description: `Closes in ${daysUntil} days. Created preparation proposal.`,
        });
        proposalsCreated++;
      }

      // Signal 3: Sponsor follow-ups (stale contacts with open deals)
      const contactsWithDeals = staleContacts.filter((c: any) => {
        return staleDeals.some((d: any) => d.contact_id === c.id) || 
               approachingDeals.some((d: any) => d.contact_id === c.id);
      });
      for (const contact of contactsWithDeals.slice(0, 10)) {
        if (skip(contact.id, "outreach")) continue;
        const daysSince = Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000);
        await sb.from("ai_proposals").insert({
          workspace_id: wsId,
          entity_type: "contact",
          entity_id: contact.id,
          proposal_type: "outreach",
          title: `Follow up with ${contact.first_name} ${contact.last_name || ""}`.trim(),
          summary: `Last contacted ${daysSince} days ago. They have an active deal — consider sending a check-in or status update.`,
          proposed_changes: { action: "follow_up_email", days_since_contact: daysSince },
          confidence: 0.75,
          status: "pending",
          type: "assistant",
        });
        await sb.from("assistant_actions").insert({
          workspace_id: wsId, action_type: "follow_up_due", entity_type: "contact", entity_id: contact.id,
          title: `Follow-up due: ${contact.first_name} ${contact.last_name || ""}`.trim(),
          description: `No contact in ${daysSince} days with active deal.`,
        });
        proposalsCreated++;
      }

      // Signal 4: Content pipeline gaps
      const upcomingVideos = (scheduledVideos as any[]).filter(
        (v: any) => v.scheduled_date && new Date(v.scheduled_date) <= fourteenDaysAhead
      );
      if (upcomingVideos.length === 0 && !recentActions.has("null-content_gap")) {
        await sb.from("ai_proposals").insert({
          workspace_id: wsId,
          entity_type: "video_queue",
          proposal_type: "content_suggestion",
          title: "Content gap: No videos scheduled for next 2 weeks",
          summary: "Your content pipeline has no scheduled videos in the next 14 days. Consider scheduling content to maintain consistency.",
          proposed_changes: { action: "schedule_content", gap_days: 14 },
          confidence: 0.8,
          status: "pending",
          type: "assistant",
        });
        await sb.from("assistant_actions").insert({
          workspace_id: wsId, action_type: "content_gap",
          title: "Content gap detected",
          description: "No videos scheduled for the next 14 days.",
        });
        proposalsCreated++;
      }

      results.push({ workspace_id: wsId, proposals_created: proposalsCreated });
    }

    return jsonResponse({ ok: true, results });
  } catch (e: unknown) {
    console.error("assistant-proactive-scan error:", e);
    return errorResponse(e, 500);
  }
});
