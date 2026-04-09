import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIMILARITY_THRESHOLD = 0.90;

interface MemoryRow {
  id: string;
  content: string;
  confidence_score: number;
  agent_id: string;
  created_at: string;
  embedding: number[];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function clusterMemories(memories: MemoryRow[], threshold: number) {
  const visited = new Set<string>();
  const clusters: { members: MemoryRow[]; avgSimilarity: number }[] = [];

  for (let i = 0; i < memories.length; i++) {
    if (visited.has(memories[i].id)) continue;
    const cluster: MemoryRow[] = [memories[i]];
    visited.add(memories[i].id);
    let simSum = 0;
    let simCount = 0;

    for (let j = i + 1; j < memories.length; j++) {
      if (visited.has(memories[j].id)) continue;
      const sim = cosine(memories[i].embedding, memories[j].embedding);
      if (sim >= threshold) {
        cluster.push(memories[j]);
        visited.add(memories[j].id);
        simSum += sim;
        simCount++;
      }
    }

    if (cluster.length > 1) {
      clusters.push({
        members: cluster,
        avgSimilarity: simCount > 0 ? simSum / simCount : 1,
      });
    }
  }

  return clusters;
}

function generateTopicLabel(members: MemoryRow[]): string {
  const words = members
    .flatMap((m) => m.content.toLowerCase().split(/\s+/))
    .filter((w) => w.length > 3);
  const freq: Record<string, number> = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  return top.length > 0 ? top.join(" / ") : "Related memories";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspace_id, threshold } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active memories with embeddings
    const { data: memories, error } = await supabase
      .from("assistant_memory")
      .select("id, content, confidence_score, agent_id, created_at, embedding")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .eq("review_status", "approved")
      .not("embedding", "is", null)
      .limit(500);

    if (error) throw error;

    if (!memories || memories.length === 0) {
      return new Response(
        JSON.stringify({ clusters: [], total_memories: 0, duplication_rate: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse embedding strings to float arrays
    const parsed: MemoryRow[] = memories
      .filter((m: any) => m.embedding)
      .map((m: any) => {
        let emb: number[];
        if (typeof m.embedding === "string") {
          // pgvector format: "[0.1,0.2,...]"
          emb = JSON.parse(m.embedding.replace(/^\[/, "[").replace(/\]$/, "]"));
        } else {
          emb = m.embedding;
        }
        return { ...m, embedding: emb };
      })
      .filter((m: MemoryRow) => Array.isArray(m.embedding) && m.embedding.length > 0);

    const sim = threshold || SIMILARITY_THRESHOLD;
    const clusters = clusterMemories(parsed, sim);

    const duplicateIds = new Set(clusters.flatMap((c) => c.members.map((m) => m.id)));
    const duplicationRate = parsed.length > 0
      ? Math.round((duplicateIds.size / parsed.length) * 100)
      : 0;

    const result = clusters.map((c, idx) => ({
      cluster_id: `cluster_${idx}`,
      topic_label: generateTopicLabel(c.members),
      avg_similarity: Math.round(c.avgSimilarity * 100) / 100,
      avg_confidence:
        Math.round(
          (c.members.reduce((s, m) => s + (m.confidence_score || 0), 0) / c.members.length) * 100
        ) / 100,
      members: c.members.map(({ embedding: _, ...rest }) => rest),
    }));

    return new Response(
      JSON.stringify({
        clusters: result,
        total_memories: parsed.length,
        duplicate_count: duplicateIds.size,
        duplication_rate: duplicationRate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cluster-memories error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
