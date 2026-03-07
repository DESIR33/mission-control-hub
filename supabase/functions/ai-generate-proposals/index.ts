import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid DB enum values for CHECK constraints
const VALID_ENTITY_TYPES = ["contact", "deal", "company"] as const;
const VALID_PROPOSAL_TYPES = [
  "enrichment",
  "outreach",
  "deal_update",
  "score_update",
  "tag_suggestion",
] as const;

// Logical proposal types the LLM may produce (superset of DB-valid ones)
const ACCEPTED_PROPOSAL_TYPES = [
  ...VALID_PROPOSAL_TYPES,
  "content_suggestion",
] as const;

type ValidEntityType = (typeof VALID_ENTITY_TYPES)[number];
type ValidProposalType = (typeof VALID_PROPOSAL_TYPES)[number];
type AcceptedProposalType = (typeof ACCEPTED_PROPOSAL_TYPES)[number];

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

    const { workspace_id, request_type } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured. Set it as a Supabase secret.");
    }

    // Gather context data
    const [videoStatsRes, channelStatsRes, contactsRes, dealsRes, videoQueueRes, goalRes] =
      await Promise.all([
        supabase
          .from("youtube_video_stats")
          .select("title, views, likes, comments, ctr_percent, published_at")
          .eq("workspace_id", workspace_id)
          .order("views", { ascending: false })
          .limit(20),
        supabase
          .from("youtube_channel_stats")
          .select("subscriber_count, video_count, total_view_count, fetched_at")
          .eq("workspace_id", workspace_id)
          .order("fetched_at", { ascending: false })
          .limit(1),
        supabase
          .from("contacts")
          .select("id, first_name, last_name, email, status, last_contact_date, company_id")
          .eq("workspace_id", workspace_id)
          .is("deleted_at", null)
          .limit(50),
        supabase
          .from("deals")
          .select("id, title, value, stage, expected_close_date, contact_id, company_id, updated_at")
          .eq("workspace_id", workspace_id)
          .is("deleted_at", null),
        supabase
          .from("video_queue")
          .select("id, title, status, scheduled_date, platform")
          .eq("workspace_id", workspace_id)
          .neq("status", "published")
          .limit(20),
        supabase
          .from("growth_goals")
          .select("target_value, current_value, target_date")
          .eq("workspace_id", workspace_id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

    const context = {
      youtube_videos: videoStatsRes.data ?? [],
      channel_stats: channelStatsRes.data?.[0] ?? null,
      contacts: contactsRes.data ?? [],
      deals: dealsRes.data ?? [],
      video_queue: videoQueueRes.data ?? [],
      growth_goal: goalRes.data ?? null,
    };

    // Build the content-suggestions addendum when request_type asks for it
    const contentSuggestionPrompt =
      request_type === "content_suggestions"
        ? `\n\nIMPORTANT — Content Suggestions Request:
Based on this channel's performance data, suggest 3-5 video ideas that would maximize subscriber growth. For each, provide:
- title: a compelling video title
- format_type: one of "tutorial", "review", "vlog", "shorts", or "other"
- estimated_impact: "high", "medium", or "low"
- reasoning: a brief explanation grounded in the data
- suggested_priority: "high", "medium", or "low"

For content suggestion proposals use:
- entity_type: "video_queue"
- entity_id: "00000000-0000-0000-0000-000000000000" (placeholder)
- proposal_type: "content_suggestion"
- proposed_changes: an object containing the fields above (title, format_type, estimated_impact, reasoning, suggested_priority)
`
        : "";

    // Call Anthropic API
    const systemPrompt = `You are a YouTube growth strategist and business advisor for a creator channel called "Hustling Labs".
Your job is to analyze their data and generate actionable proposals.

The creator's goal: Grow from ${context.growth_goal?.current_value ?? "21,000"} to ${context.growth_goal?.target_value ?? "50,000"} subscribers by ${context.growth_goal?.target_date ?? "end of year"}.

Generate 3-5 proposals. Each proposal MUST be a JSON object with these fields:
- entity_type: "contact" | "deal" | "company" | "video_queue"
- entity_id: UUID of the relevant entity (use a contact/deal ID from the data, or "00000000-0000-0000-0000-000000000000" for content suggestions)
- proposal_type: "enrichment" | "outreach" | "deal_update" | "score_update" | "tag_suggestion" | "content_suggestion"
- title: Short title (max 80 chars)
- summary: 1-2 sentence explanation
- proposed_changes: Object with specific suggested changes
- confidence: Number 0.0-1.0

Focus on:
1. Content strategy: Which video topics/formats perform best? What should they create next?
2. Stale contacts: Who hasn't been contacted recently and should be followed up?
3. Deal opportunities: Which deals need attention or are at risk?
4. Growth tactics: What patterns in their data suggest growth opportunities?
${contentSuggestionPrompt}
Return ONLY a JSON array of proposals. No markdown, no explanation, just the array.`;

    const userPrompt = `Here is the current data for analysis:\n\n${JSON.stringify(context, null, 2)}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.status} - ${errBody}`);
    }

    const anthropicData = await anthropicRes.json();
    const responseText = anthropicData.content?.[0]?.text ?? "[]";

    // Parse proposals from LLM response
    let proposals: any[];
    try {
      // Handle potential markdown wrapping
      const jsonStr = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      proposals = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse LLM response:", responseText);
      proposals = [];
    }

    // Insert proposals into database
    const inserted: string[] = [];
    for (const p of proposals) {
      const rawProposalType: AcceptedProposalType = p.proposal_type || "content_suggestion";
      const rawEntityType: string = p.entity_type || "contact";

      // The DB CHECK constraint only allows specific entity_type values.
      // "video_queue" is not in the constraint, so fall back to "company".
      const dbEntityType: ValidEntityType = (
        VALID_ENTITY_TYPES as readonly string[]
      ).includes(rawEntityType)
        ? (rawEntityType as ValidEntityType)
        : "company";

      // The DB CHECK constraint only allows specific proposal_type values.
      // "content_suggestion" is not in the constraint, so fall back to
      // "tag_suggestion" and store the real type inside proposed_changes.
      const isContentSuggestion = rawProposalType === "content_suggestion";
      const dbProposalType: ValidProposalType = (
        VALID_PROPOSAL_TYPES as readonly string[]
      ).includes(rawProposalType)
        ? (rawProposalType as ValidProposalType)
        : "tag_suggestion";

      const proposedChanges = {
        ...(p.proposed_changes || {}),
        // Preserve the original values so the UI / downstream logic can
        // distinguish content_suggestion from a real tag_suggestion.
        ...(isContentSuggestion
          ? { _actual_proposal_type: "content_suggestion" }
          : {}),
        ...(rawEntityType !== dbEntityType
          ? { _actual_entity_type: rawEntityType }
          : {}),
      };

      // For content suggestions, use a deterministic placeholder UUID when
      // the LLM returns the placeholder or no valid UUID.
      const CONTENT_SUGGESTION_PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
      const entityId =
        isContentSuggestion
          ? (p.entity_id && p.entity_id !== "general"
              ? p.entity_id
              : CONTENT_SUGGESTION_PLACEHOLDER_ID)
          : (p.entity_id || workspace_id);

      const { error: insertError } = await supabase.from("ai_proposals").insert({
        workspace_id,
        entity_type: dbEntityType,
        entity_id: entityId,
        proposal_type: dbProposalType,
        title: p.title || "AI Suggestion",
        summary: p.summary || null,
        proposed_changes: proposedChanges,
        confidence: p.confidence || 0.7,
        status: "pending",
      });

      if (insertError) {
        console.error("Failed to insert proposal:", insertError.message, {
          title: p.title,
          entity_type: dbEntityType,
          proposal_type: dbProposalType,
        });
      } else {
        inserted.push(p.title);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposals_generated: proposals.length,
        proposals_saved: inserted.length,
        titles: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
