import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

interface EventPayload {
  workspace_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
}

const EVENT_PROMPTS: Record<string, (data: Record<string, unknown>) => string> = {
  deal_stage_change: (d) =>
    `A CRM deal changed stage. Extract 1-3 memories about what happened and any business learnings.
Deal: "${d.deal_title}"
Old stage: ${d.old_stage} → New stage: ${d.new_stage}
Value: $${d.value || 0}
${d.new_stage === "closed_won" ? "This deal was WON. What worked? What should be repeated?" : ""}
${d.new_stage === "closed_lost" ? "This deal was LOST. What went wrong? What should be avoided?" : ""}`,

  video_performance: (d) =>
    `A YouTube video hit a performance milestone. Extract 1-3 memories about what made it successful.
Title: "${d.title}"
Views: ${d.views} (top ${d.percentile}% of channel)
CTR: ${d.ctr}%
Avg view duration: ${d.avg_view_duration}s
${d.tags ? `Tags: ${d.tags}` : ""}`,

  email_important: (d) =>
    `An important email was received/sent. Extract 1-2 memories about key decisions or commitments.
Subject: "${d.subject}"
From: ${d.from}
Priority: ${d.priority}
Summary: ${d.summary || d.snippet || ""}`,

  agent_execution: (d) =>
    `An AI agent completed an execution. Extract 1-2 memories about learnings or patterns.
Agent: ${d.agent_slug}
Skill: ${d.skill_slug || "general"}
Proposals created: ${d.proposals_created}
Duration: ${d.duration_ms}ms
Input summary: ${JSON.stringify(d.input).slice(0, 500)}
Output summary: ${JSON.stringify(d.output).slice(0, 500)}`,
};

async function generateMemories(
  eventType: string,
  eventData: Record<string, unknown>
): Promise<Array<{ content: string; tags: string[]; confidence: number }>> {
  const promptFn = EVENT_PROMPTS[eventType];
  if (!promptFn) return [];

  const contextPrompt = promptFn(eventData);

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a memory extraction engine for a creator business platform. Given a business event, extract 1-3 atomic, self-contained facts or learnings worth remembering long-term.

Rules:
- Each memory should be a single fact, learning, or pattern
- Focus on actionable insights, not just restating what happened
- Assign confidence 0.6-0.95 based on clarity
- Tag with relevant categories: "deal", "revenue", "youtube", "email", "agent", "pattern", "strategy", "contact", "content"
- Return ONLY a valid JSON array

Output: [{"content": "...", "tags": ["..."], "confidence": 0.8}]`,
        },
        { role: "user", content: contextPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!resp.ok) {
    console.error("OpenRouter error:", resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || "[]";

  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed) ? parsed : parsed.memories || parsed.items || [];
    return arr
      .filter((m: any) => m.content && m.content.length > 10)
      .map((m: any) => ({
        content: m.content.trim(),
        tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
        confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0.7)),
      }));
  } catch {
    console.error("Failed to parse AI response:", raw);
    return [];
  }
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: text,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

async function checkDuplicate(
  supabase: any,
  workspaceId: string,
  embedding: number[]
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("memory_vector_search", {
      query_embedding: JSON.stringify(embedding),
      ws_id: workspaceId,
      match_count: 1,
    });
    if (data && data.length > 0 && data[0].similarity > 0.92) {
      return true;
    }
  } catch {
    // If search fails, proceed with insert
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspace_id, event_type, event_data } =
      (await req.json()) as EventPayload;

    if (!workspace_id || !event_type || !event_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check pipeline config
    const { data: config } = await supabase
      .from("memory_pipeline_config")
      .select("enabled, config")
      .eq("workspace_id", workspace_id)
      .eq("pipeline_key", event_type)
      .maybeSingle();

    if (!config || !config.enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "pipeline_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply threshold filters
    const pipelineConfig = config.config as Record<string, any>;

    if (event_type === "deal_stage_change") {
      const stages = pipelineConfig.stages || ["closed_won", "closed_lost"];
      if (!stages.includes(event_data.new_stage)) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "stage_not_tracked" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const minValue = pipelineConfig.min_value || 0;
      if ((event_data.value as number) < minValue) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "below_min_value" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (event_type === "agent_execution") {
      const minProposals = pipelineConfig.min_proposals || 1;
      if ((event_data.proposals_created as number) < minProposals) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "below_min_proposals" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate memories via AI
    const memories = await generateMemories(event_type, event_data);

    if (memories.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, reason: "no_memories_extracted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert each memory with dedup check
    let created = 0;
    let skipped = 0;

    for (const mem of memories) {
      const embedding = await generateEmbedding(mem.content);

      if (embedding) {
        const isDup = await checkDuplicate(supabase, workspace_id, embedding);
        if (isDup) {
          skipped++;
          continue;
        }
      }

      const { error } = await supabase.from("assistant_memory").insert({
        workspace_id,
        content: mem.content,
        origin: "auto_pipeline",
        source_type: "auto_pipeline",
        tags: mem.tags,
        confidence_score: mem.confidence,
        importance_score: 0.7,
        review_status: "pending",
        status: "active",
        visibility: "shared",
        agent_id: `pipeline_${event_type}`,
        memory_type: "learned",
        embedding: embedding ? JSON.stringify(embedding) : null,
        entity_type: event_type === "deal_stage_change" ? "deal" : event_type === "video_performance" ? "video" : null,
        entity_id: (event_data.deal_id || event_data.video_id || null) as string | null,
      });

      if (error) {
        console.error("Insert error:", error);
      } else {
        created++;
      }
    }

    console.log(
      `auto-memory-extractor: ${event_type} → ${created} created, ${skipped} deduped`
    );

    return new Response(
      JSON.stringify({ created, skipped, total_extracted: memories.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-memory-extractor error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
