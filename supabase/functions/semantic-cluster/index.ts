import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function kMeans(points: number[][], k: number, maxIter = 30) {
  const n = points.length;
  const dim = points[0].length;
  const centroids: number[][] = [points[Math.floor(Math.random() * n)]];
  while (centroids.length < k) {
    const dists = points.map((p) => {
      let minD = Infinity;
      for (const c of centroids) {
        let d = 0;
        for (let i = 0; i < dim; i++) d += (p[i] - c[i]) ** 2;
        if (d < minD) minD = d;
      }
      return minD;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < n; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push([...points[i]]); break; }
    }
  }
  const assignments = new Int32Array(n);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let bestC = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let j = 0; j < dim; j++) d += (points[i][j] - centroids[c][j]) ** 2;
        if (d < bestD) { bestD = d; bestC = c; }
      }
      if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true; }
    }
    if (!changed) break;
    const sums = Array.from({ length: k }, () => new Float64Array(dim));
    const counts = new Int32Array(k);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let j = 0; j < dim; j++) sums[c][j] += points[i][j];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      for (let j = 0; j < dim; j++) centroids[c][j] = sums[c][j] / counts[c];
    }
  }
  return Array.from(assignments);
}

function project2D(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0]];
  const dim = embeddings[0].length;
  const mean = new Float64Array(dim);
  for (const e of embeddings) for (let j = 0; j < dim; j++) mean[j] += e[j] / n;
  const centered = embeddings.map((e) => e.map((v, j) => v - mean[j]));

  const getPC = (data: number[][], exclude?: number[]) => {
    let v = Array.from({ length: dim }, () => Math.random() - 0.5);
    if (exclude) {
      const dot = v.reduce((s, x, i) => s + x * exclude[i], 0);
      v = v.map((x, i) => x - dot * exclude[i]);
    }
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map((x) => x / (norm || 1));
    for (let iter = 0; iter < 50; iter++) {
      const nv = new Float64Array(dim);
      for (const row of data) {
        const d = row.reduce((s, x, i) => s + x * v[i], 0);
        for (let i = 0; i < dim; i++) nv[i] += d * row[i];
      }
      if (exclude) {
        const d2 = Array.from(nv).reduce((s, x, i) => s + x * exclude[i], 0);
        for (let i = 0; i < dim; i++) nv[i] -= d2 * exclude[i];
      }
      norm = Math.sqrt(Array.from(nv).reduce((s, x) => s + x * x, 0));
      v = Array.from(nv).map((x) => x / (norm || 1));
    }
    return v;
  };
  const pc1 = getPC(centered);
  const pc2 = getPC(centered, pc1);
  const coords = centered.map((row) => [
    row.reduce((s, x, i) => s + x * pc1[i], 0),
    row.reduce((s, x, i) => s + x * pc2[i], 0),
  ]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const rx = maxX - minX || 1;
  const ry = maxY - minY || 1;
  return coords.map(([x, y]) => [(x - minX) / rx, (y - minY) / ry]);
}

function generateLabel(contents: string[]): string {
  const stop = new Set(["the","a","an","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","can","to","of","in","for","on","with","at","by","from","as","into","through","during","before","after","between","out","off","over","under","again","then","once","here","there","when","where","why","how","all","each","every","both","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","just","because","and","but","or","if","it","its","this","that","these","those","i","me","my","we","our","you","your","he","him","his","she","her","they","them","their","what","which","who","whom","about","also","like","using","used"]);
  const freq: Record<string, number> = {};
  for (const c of contents) {
    for (const w of c.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)) {
      if (w.length > 2 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
    }
  }
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
  return top.length ? top.join(" · ") : "Miscellaneous";
}

const COLORS = [
  "#6366f1","#14b8a6","#f59e0b","#ec4899","#3b82f6",
  "#10b981","#ef4444","#8b5cf6","#f97316","#0ea5e9",
  "#a855f7","#64748b","#e11d48","#22d3ee","#84cc16",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { workspace_id, k = 8 } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: memories, error } = await sb
      .from("assistant_memory")
      .select("id, content, confidence_score, agent_id, embedding, created_at")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .not("embedding", "is", null)
      .limit(500);

    if (error) throw error;
    if (!memories?.length) {
      return new Response(JSON.stringify({ clusters: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embeddings: number[][] = memories.map((m: any) => {
      if (typeof m.embedding === "string") {
        return m.embedding.replace(/^\[|\]$/g, "").split(",").map(Number);
      }
      return m.embedding;
    });

    const effectiveK = Math.min(k, memories.length, 15);
    const assignments = effectiveK > 0 ? kMeans(embeddings, effectiveK) : memories.map(() => 0);
    const coords = project2D(embeddings);

    const clusterMap: Record<number, any[]> = {};
    for (let i = 0; i < memories.length; i++) {
      const c = assignments[i];
      if (!clusterMap[c]) clusterMap[c] = [];
      clusterMap[c].push({
        memory_id: memories[i].id,
        content: memories[i].content,
        confidence: memories[i].confidence_score ?? 0.5,
        agent_id: memories[i].agent_id,
        created_at: memories[i].created_at,
        x: coords[i][0],
        y: coords[i][1],
      });
    }

    const clusters = Object.entries(clusterMap).map(([cId, members], idx) => ({
      id: `cluster-${cId}`,
      label: generateLabel(members.map((m: any) => m.content)),
      color: COLORS[idx % COLORS.length],
      members,
    }));

    return new Response(JSON.stringify({ clusters }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
