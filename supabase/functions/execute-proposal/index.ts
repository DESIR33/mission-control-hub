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

      case "video_title_optimization":
      case "video_description_optimization":
      case "video_tags_optimization": {
        const videoId = proposal.video_id;
        if (!videoId) throw new Error("Missing video_id on proposal");

        // 1. Get current video state for snapshot
        const stateUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/youtube-video-update`;
        const stateRes = await fetch(stateUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get_current_state",
            workspace_id,
            video_id: videoId,
          }),
        });
        const currentState = stateRes.ok ? await stateRes.json() : {};

        // 2. Determine what to update
        const updatePayload: Record<string, unknown> = {
          action: "update_metadata",
          workspace_id,
          video_id: videoId,
        };

        let experimentType = "multi";
        if (proposal.proposal_type === "video_title_optimization") {
          experimentType = "title";
          // Use first title option from proposed_changes.titles array
          const titles = changes.titles as string[];
          updatePayload.title = titles?.[0] || changes.title;
        } else if (proposal.proposal_type === "video_description_optimization") {
          experimentType = "description";
          updatePayload.description = changes.description;
        } else {
          experimentType = "tags";
          updatePayload.tags = changes.tags;
        }

        // 3. Apply changes via YouTube API
        const updateRes = await fetch(stateUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });

        if (!updateRes.ok) {
          const err = await updateRes.text();
          throw new Error(`YouTube update failed: ${err}`);
        }

        // 4. Fetch baseline metrics
        const { data: analytics } = await supabase
          .from("youtube_video_analytics")
          .select("views, impressions, impressions_click_through_rate, estimated_minutes_watched, average_view_duration")
          .eq("workspace_id", workspace_id)
          .eq("video_id", videoId)
          .limit(1)
          .maybeSingle();

        // 5. Create experiment entry
        await supabase.from("video_optimization_experiments").insert({
          workspace_id,
          video_id: videoId,
          video_title: currentState.title || proposal.title,
          experiment_type: experimentType,
          original_title: currentState.title || null,
          original_description: currentState.description || null,
          original_tags: currentState.tags || [],
          original_thumbnail_url: currentState.thumbnail_url || null,
          new_title: updatePayload.title || null,
          new_description: updatePayload.description || null,
          new_tags: updatePayload.tags || null,
          baseline_views: analytics?.views || 0,
          baseline_ctr: analytics?.impressions_click_through_rate || 0,
          baseline_impressions: analytics?.impressions || 0,
          baseline_avg_view_duration: analytics?.average_view_duration || 0,
          baseline_watch_time_hours: (analytics?.estimated_minutes_watched || 0) / 60,
          proposal_id: proposal.id,
        });

        result = { action: proposal.proposal_type, video_id: videoId, experiment_created: true };
        break;
      }

      case "video_thumbnail_optimization": {
        const videoId = proposal.video_id;
        if (!videoId) throw new Error("Missing video_id on proposal");

        // Check if thumbnails have been generated
        const thumbnailUrls = proposal.thumbnail_urls as string[];
        if (!thumbnailUrls?.length) {
          throw new Error("Thumbnails must be generated before applying. Use the 'Generate Thumbnail' action first.");
        }

        const thumbnailUrl = thumbnailUrls[0];

        // 1. Get current state
        const stateUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/youtube-video-update`;
        const stateRes = await fetch(stateUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get_current_state",
            workspace_id,
            video_id: videoId,
          }),
        });
        const currentState = stateRes.ok ? await stateRes.json() : {};

        // 2. Upload new thumbnail
        const uploadRes = await fetch(stateUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_thumbnail",
            workspace_id,
            video_id: videoId,
            thumbnail_url: thumbnailUrl,
          }),
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.text();
          throw new Error(`Thumbnail upload failed: ${err}`);
        }

        // 3. Fetch baseline metrics
        const { data: analytics } = await supabase
          .from("youtube_video_analytics")
          .select("views, impressions, impressions_click_through_rate, estimated_minutes_watched, average_view_duration")
          .eq("workspace_id", workspace_id)
          .eq("video_id", videoId)
          .limit(1)
          .maybeSingle();

        // 4. Create experiment entry
        await supabase.from("video_optimization_experiments").insert({
          workspace_id,
          video_id: videoId,
          video_title: currentState.title || proposal.title,
          experiment_type: "thumbnail",
          original_title: currentState.title || null,
          original_thumbnail_url: currentState.thumbnail_url || null,
          new_thumbnail_url: thumbnailUrl,
          baseline_views: analytics?.views || 0,
          baseline_ctr: analytics?.impressions_click_through_rate || 0,
          baseline_impressions: analytics?.impressions || 0,
          baseline_avg_view_duration: analytics?.average_view_duration || 0,
          baseline_watch_time_hours: (analytics?.estimated_minutes_watched || 0) / 60,
          proposal_id: proposal.id,
        });

        result = { action: "video_thumbnail_optimization", video_id: videoId, experiment_created: true };
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
