import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ConflictCandidate {
  id: string;
  content: string;
  similarity: number;
  origin: string;
  confidence_score: number;
  created_at: string;
}

async function classifyConflict(
  contentA: string,
  contentB: string,
  apiKey: string,
): Promise<{ is_conflict: boolean; conflict_type: string; explanation: string } | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You compare two memory statements and determine if they conflict.
Return JSON: {"is_conflict": boolean, "conflict_type": "factual"|"temporal"|"preference"|"scope", "explanation": "..."}
- factual: contradictory facts about the same subject
- temporal: outdated info superseded by newer info
- preference: conflicting preferences or strategies
- scope: same topic but different scopes that seem contradictory
If they are complementary or unrelated, set is_conflict=false.`,
          },
          { role: "user", content: `Memory A: "${contentA}"\n\nMemory B: "${contentB}"` },
        ],
        max_tokens: 200,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { memory_id, workspace_id, content, embedding, origin, confidence_score } = await req.json();
    if (!memory_id || !workspace_id) return json({ error: "memory_id and workspace_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return json({ error: "No AI API key configured" }, 500);

    // Find similar memories (0.80-0.95 range — related but not duplicates)
    if (!embedding) return json({ conflicts_detected: 0, message: "No embedding, skipping" });

    const { data: similar } = await supabase.rpc("memory_vector_search", {
      query_embedding: embedding,
      ws_id: workspace_id,
      match_count: 5,
    });

    const candidates: ConflictCandidate[] = (similar || []).filter(
      (s: any) => s.id !== memory_id && s.similarity > 0.80 && s.similarity < 0.95,
    );

    if (candidates.length === 0) return json({ conflicts_detected: 0 });

    const memContent = content || (await supabase.from("assistant_memory").select("content").eq("id", memory_id).single()).data?.content;
    if (!memContent) return json({ conflicts_detected: 0, message: "Could not read memory content" });

    let detected = 0;
    const results: any[] = [];

    for (const candidate of candidates) {
      // Check if conflict already exists between these two
      const { data: existing } = await supabase
        .from("memory_conflicts")
        .select("id")
        .or(`and(memory_a_id.eq.${memory_id},memory_b_id.eq.${candidate.id}),and(memory_a_id.eq.${candidate.id},memory_b_id.eq.${memory_id})`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // AI classification
      const classification = await classifyConflict(memContent, candidate.content, apiKey);
      if (!classification || !classification.is_conflict) continue;

      // Auto-resolution: manual origin supersedes agent-generated
      const newOrigin = origin || "unknown";
      const existingOrigin = candidate.origin;
      let autoResolved = false;

      if (newOrigin === "manual" && existingOrigin !== "manual") {
        // Auto-resolve: keep new (manual), archive old (agent)
        await supabase
          .from("assistant_memory")
          .update({ status: "archived" })
          .eq("id", candidate.id);

        const { data: conflict } = await supabase
          .from("memory_conflicts")
          .insert({
            workspace_id,
            memory_a_id: memory_id,
            memory_b_id: candidate.id,
            conflict_type: classification.conflict_type,
            status: "resolved",
            resolution_type: "auto_manual_wins",
            resolved_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        autoResolved = true;
        results.push({ conflict_id: conflict?.id, candidate_id: candidate.id, type: classification.conflict_type, auto_resolved: true });
      } else if (
        (confidence_score ?? 0) > (candidate.confidence_score ?? 0) + 0.15 &&
        classification.conflict_type === "temporal"
      ) {
        // Auto-resolve temporal conflicts when new memory has significantly higher confidence
        await supabase
          .from("assistant_memory")
          .update({ status: "archived" })
          .eq("id", candidate.id);

        const { data: conflict } = await supabase
          .from("memory_conflicts")
          .insert({
            workspace_id,
            memory_a_id: memory_id,
            memory_b_id: candidate.id,
            conflict_type: classification.conflict_type,
            status: "resolved",
            resolution_type: "auto_confidence_wins",
            resolved_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        autoResolved = true;
        results.push({ conflict_id: conflict?.id, candidate_id: candidate.id, type: classification.conflict_type, auto_resolved: true });
      }

      if (!autoResolved) {
        // Flag for manual review
        const { data: conflict } = await supabase
          .from("memory_conflicts")
          .insert({
            workspace_id,
            memory_a_id: memory_id,
            memory_b_id: candidate.id,
            conflict_type: classification.conflict_type,
            status: "pending",
          })
          .select("id")
          .single();

        detected++;
        results.push({ conflict_id: conflict?.id, candidate_id: candidate.id, type: classification.conflict_type, auto_resolved: false });
      }
    }

    return json({ conflicts_detected: detected, auto_resolved: results.filter((r) => r.auto_resolved).length, results });
  } catch (error: unknown) {
    console.error("memory-conflict-detector error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
