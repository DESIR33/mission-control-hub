import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { memory_id, entity_type, entity_id, workspace_id, depth = 1 } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If querying by entity, find all memories for that entity first
    let seedMemoryIds: string[] = [];

    if (memory_id) {
      seedMemoryIds = [memory_id];
    } else if (entity_type && entity_id) {
      const { data: entityMemories } = await supabase
        .from("assistant_memory")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("entity_type", entity_type)
        .eq("entity_id", entity_id)
        .limit(20);

      seedMemoryIds = (entityMemories || []).map((m: any) => m.id);
    }

    if (seedMemoryIds.length === 0) {
      return new Response(
        JSON.stringify({ nodes: [], edges: [], seed_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Traverse graph from each seed
    const nodesMap = new Map<string, any>();
    const edgesMap = new Map<string, any>();

    for (const seedId of seedMemoryIds) {
      const { data: graphData } = await supabase.rpc("get_memory_graph", {
        p_memory_id: seedId,
        p_depth: Math.min(depth, 3), // Cap at 3 to prevent explosion
        p_workspace_id: workspace_id,
      });

      if (graphData) {
        for (const row of graphData) {
          if (!nodesMap.has(row.memory_id)) {
            nodesMap.set(row.memory_id, {
              id: row.memory_id,
              content: row.content,
              origin: row.origin,
              tags: row.tags,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              depth: row.depth,
              is_seed: seedMemoryIds.includes(row.memory_id),
            });
          }

          if (row.connected_from && row.rel_type) {
            const edgeKey = `${row.connected_from}->${row.memory_id}:${row.rel_type}`;
            if (!edgesMap.has(edgeKey)) {
              edgesMap.set(edgeKey, {
                id: edgeKey,
                source: row.connected_from,
                target: row.memory_id,
                relationship_type: row.rel_type,
                strength: row.rel_strength,
              });
            }
          }
        }
      }
    }

    // Also fetch direct relationships for all discovered nodes
    const allNodeIds = Array.from(nodesMap.keys());
    if (allNodeIds.length > 0 && allNodeIds.length <= 50) {
      const { data: directEdges } = await supabase
        .from("memory_relationships")
        .select("source_memory_id, target_memory_id, relationship_type, strength")
        .or(`source_memory_id.in.(${allNodeIds.join(",")}),target_memory_id.in.(${allNodeIds.join(",")})`)
        .limit(200);

      if (directEdges) {
        for (const edge of directEdges) {
          // Only include edges where both nodes are in our set
          if (nodesMap.has(edge.source_memory_id) && nodesMap.has(edge.target_memory_id)) {
            const edgeKey = `${edge.source_memory_id}->${edge.target_memory_id}:${edge.relationship_type}`;
            if (!edgesMap.has(edgeKey)) {
              edgesMap.set(edgeKey, {
                id: edgeKey,
                source: edge.source_memory_id,
                target: edge.target_memory_id,
                relationship_type: edge.relationship_type,
                strength: edge.strength,
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        nodes: Array.from(nodesMap.values()),
        edges: Array.from(edgesMap.values()),
        seed_count: seedMemoryIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("memory-graph-query error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
