import { corsHeaders } from "@supabase/supabase-js/cors";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

const SYSTEM_PROMPT = `You are an AI memory extractor for a creator's command center. Given a raw conversation transcript, extract discrete, atomic facts that would be useful for an AI assistant to remember long-term.

Rules:
- Each memory should be a single, self-contained fact or preference
- Do NOT extract trivial greetings or filler
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
    const { conversation_text, agent_id } = await req.json();

    if (!conversation_text || typeof conversation_text !== "string" || conversation_text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "conversation_text must be at least 20 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.7",
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
