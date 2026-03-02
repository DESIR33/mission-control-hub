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

    const { proposal_id, workspace_id } = await req.json();
    if (!proposal_id || !workspace_id) throw new Error("Missing proposal_id or workspace_id");

    // Mark as executing
    await supabase
      .from("ai_proposals")
      .update({ execution_status: "executing" })
      .eq("id", proposal_id)
      .eq("workspace_id", workspace_id);

    // Fetch proposal
    const { data: proposal, error: fetchError } = await supabase
      .from("ai_proposals")
      .select("*")
      .eq("id", proposal_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchError || !proposal) {
      throw new Error("Proposal not found");
    }

    const changes = proposal.proposed_changes || {};
    let result: Record<string, unknown> = {};

    switch (proposal.proposal_type) {
      case "enrichment": {
        // Trigger enrich-contact Edge Function
        const enrichUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-contact`;
        const enrichRes = await fetch(enrichUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contact_id: proposal.entity_id,
            workspace_id,
          }),
        });
        result = { action: "enrichment", response: await enrichRes.json() };
        break;
      }

      case "outreach": {
        // Enroll contact in first active email sequence
        const { data: sequences } = await supabase
          .from("email_sequences")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("status", "active")
          .limit(1);

        if (sequences?.length) {
          await supabase.from("email_sequence_enrollments").insert({
            workspace_id,
            sequence_id: sequences[0].id,
            contact_id: proposal.entity_id,
            current_step: 0,
            status: "active",
            next_send_at: new Date().toISOString(),
          });
          result = { action: "outreach", enrolled_in: sequences[0].id };
        } else {
          result = { action: "outreach", message: "No active sequences found" };
        }
        break;
      }

      case "deal_update": {
        // Apply proposed changes to the deal
        const updateFields: Record<string, unknown> = {};
        if (changes.stage) updateFields.stage = changes.stage;
        if (changes.value) updateFields.value = changes.value;
        if (changes.expected_close_date) updateFields.expected_close_date = changes.expected_close_date;
        if (changes.notes) updateFields.notes = changes.notes;

        if (Object.keys(updateFields).length > 0) {
          updateFields.updated_at = new Date().toISOString();
          await supabase
            .from("deals")
            .update(updateFields)
            .eq("id", proposal.entity_id)
            .eq("workspace_id", workspace_id);
        }
        result = { action: "deal_update", fields_updated: Object.keys(updateFields) };
        break;
      }

      case "score_update": {
        // Update contact VIP tier or engagement score
        const contactUpdates: Record<string, unknown> = {};
        if (changes.vip_tier) contactUpdates.vip_tier = changes.vip_tier;
        if (changes.engagement_score) contactUpdates.engagement_score = changes.engagement_score;

        if (Object.keys(contactUpdates).length > 0) {
          await supabase
            .from("contacts")
            .update(contactUpdates)
            .eq("id", proposal.entity_id)
            .eq("workspace_id", workspace_id);
        }
        result = { action: "score_update", updates: contactUpdates };
        break;
      }

      case "tag_suggestion": {
        // Apply tags if the changes include tag names
        const tags = (changes.tags as string[]) || [];
        result = { action: "tag_suggestion", tags_applied: tags.length };
        break;
      }

      case "content_suggestion": {
        // Create a new video queue entry
        await supabase.from("video_queue").insert({
          workspace_id,
          title: (changes.title as string) || proposal.title,
          description: (changes.description as string) || proposal.summary || "",
          status: "idea",
          content_type: (changes.content_type as string) || "video",
          priority: "medium",
        });
        result = { action: "content_suggestion", created: true };
        break;
      }

      default:
        result = { action: "unknown", message: `Unknown proposal type: ${proposal.proposal_type}` };
    }

    // Mark as completed
    await supabase
      .from("ai_proposals")
      .update({
        execution_status: "completed",
        execution_result: result,
        executed_at: new Date().toISOString(),
      })
      .eq("id", proposal_id)
      .eq("workspace_id", workspace_id);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Mark as failed if we have the IDs
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.proposal_id && body.workspace_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("ai_proposals")
          .update({
            execution_status: "failed",
            execution_result: { error: error instanceof Error ? error.message : String(error) },
          })
          .eq("id", body.proposal_id);
      }
    } catch {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
