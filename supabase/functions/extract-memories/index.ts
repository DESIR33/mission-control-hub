import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "minimax/minimax-m2.7";

const SYSTEM_PROMPT = `You are an AI memory extractor for a creator's command center. Given a raw conversation transcript, extract discrete, atomic facts that would be useful for an AI assistant to remember long-term.

Rules:
- Each memory should be a single, self-contained fact or preference
- Do NOT extract trivial greetings or filler
- Do NOT extract simple data queries like "show me my stats" or "what are my numbers"
- Focus on: decisions, preferences, strategies, insights, goals, action items, learnings
- Assign a confidence score (0.0-1.0) based on how clearly stated the fact is
- Tag each memory with relevant categories (e.g. "preference", "workflow", "tool", "goal", "contact", "content-strategy")
- Return ONLY a valid JSON array, no markdown fences

Output format:
[{"content": "...", "confidence": 0.95, "tags": ["preference", "workflow"]}]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { conversation_text, agent_id, workspace_id, session_id, model, auto_triggered } = body;

    if (!conversation_text || typeof conversation_text !== "string" || conversation_text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "conversation_text must be at least 20 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup check: skip if conversation is mostly data queries
    if (auto_triggered) {
      const lines = conversation_text.split("\n").filter((l: string) => l.trim().length > 0);
      const userLines = lines.filter((l: string) => l.startsWith("User:") || l.startsWith("user:"));
      const queryPatterns = /\b(show me|what are|how many|list|fetch|get|display|check)\b/i;
      const queryLines = userLines.filter((l: string) => queryPatterns.test(l));
      
      if (userLines.length > 0 && queryLines.length / userLines.length > 0.7) {
        // >70% of user messages are data queries — skip extraction
        if (workspace_id && session_id) {
          const sb = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await sb.from("conversation_extraction_log").upsert({
            session_id,
            workspace_id,
            message_count: lines.length,
            memories_extracted: 0,
            skipped_reason: "mostly_data_queries",
            model_used: null,
          }, { onConflict: "session_id" });
        }
        return new Response(JSON.stringify({ memories: [], count: 0, skipped: "mostly_data_queries" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const selectedModel = model || DEFAULT_MODEL;

    const resp = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract memories from this ${agent_id || "AI"} conversation:\n\n${conversation_text.slice(0, 30000)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OpenRouter error:", resp.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "[]";

    let memories: Array<{ content: string; confidence: number; tags: string[] }>;
    try {
      const parsed = JSON.parse(raw);
      memories = Array.isArray(parsed) ? parsed : parsed.memories || parsed.facts || parsed.items || [];
    } catch {
      console.error("Failed to parse AI response:", raw);
      memories = [];
    }

    // Normalize
    memories = memories
      .filter((m) => m.content && typeof m.content === "string" && m.content.length > 5)
      .map((m) => ({
        content: m.content.trim(),
        confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0.7)),
        tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
      }));

    // If workspace_id provided and auto_triggered, save memories directly as pending
    if (workspace_id && auto_triggered && memories.length > 0) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const inserts = memories.map((m) => ({
        workspace_id,
        content: m.content,
        origin: "manual",
        tags: m.tags,
        confidence_score: m.confidence,
        importance_score: 0.5,
        review_status: "pending",
        source_type: "conversation",
        source_session_id: session_id || null,
        agent_id: agent_id || "assistant",
        memory_type: "semantic",
      }));

      const { error } = await sb.from("assistant_memory").insert(inserts);
      if (error) console.error("Failed to save extracted memories:", error.message);

      // Log extraction
      if (session_id) {
        await sb.from("conversation_extraction_log").upsert({
          session_id,
          workspace_id,
          message_count: conversation_text.split("\n").filter((l: string) => l.trim()).length,
          memories_extracted: memories.length,
          skipped_reason: null,
          model_used: selectedModel,
        }, { onConflict: "session_id" });
      }
    }

    return new Response(JSON.stringify({ memories, count: memories.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-memories error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
