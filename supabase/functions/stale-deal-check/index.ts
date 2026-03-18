import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: require service role key (this is a cron-only function)
    const auth = await validateCallerOrServiceRole(req);
    if (!auth.authorized) return auth.response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Find stale deals across all workspaces
    const { data: staleDeals } = await supabase
      .from("deals")
      .select("id, title, value, stage, workspace_id, contact_id, updated_at")
      .is("deleted_at", null)
      .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
      .lt("updated_at", fourteenDaysAgo.toISOString());

    if (!staleDeals?.length) {
      return new Response(
        JSON.stringify({ success: true, stale_deals: 0, notifications_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;

    for (const deal of staleDeals) {
      const daysSince = Math.floor(
        (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create notification
      await supabase.from("notifications").insert({
        workspace_id: deal.workspace_id,
        type: "deal_change",
        title: `Stale deal: ${deal.title}`,
        body: `This deal has had no updates in ${daysSince} days. Consider following up or closing it.`,
        entity_type: "deal",
        entity_id: deal.id,
      });

      // Create AI proposal suggesting follow-up
      await supabase.from("ai_proposals").insert({
        workspace_id: deal.workspace_id,
        entity_type: "deal",
        entity_id: deal.id,
        proposal_type: "deal_update",
        title: `Follow up on stale deal: ${deal.title}`,
        summary: `This deal has been in "${deal.stage}" for ${daysSince} days with no updates. Consider reaching out to the contact or updating the deal status.`,
        proposed_changes: {
          action: "follow_up",
          days_stale: daysSince,
          current_stage: deal.stage,
          suggested_action: daysSince > 30 ? "close_or_nurture" : "follow_up",
        },
        confidence: 0.8,
        status: "pending",
      });

      notificationsCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        stale_deals: staleDeals.length,
        notifications_created: notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("stale-deal-check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
