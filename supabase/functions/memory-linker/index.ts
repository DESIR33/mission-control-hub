import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface LinkResult {
  entity_links: number;
  similarity_links: number;
  errors: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { memory_id, workspace_id } = await req.json();

    if (!memory_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "memory_id and workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the source memory
    const { data: source, error: srcErr } = await supabase
      .from("assistant_memory")
      .select("id, content, origin, tags, entity_type, entity_id, embedding, workspace_id")
      .eq("id", memory_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (srcErr || !source) {
      return new Response(
        JSON.stringify({ error: "Memory not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: LinkResult = { entity_links: 0, similarity_links: 0, errors: 0 };

    // 1. Entity-based linking: find memories with same entity_type + entity_id
    if (source.entity_type && source.entity_id) {
      const { data: entityMatches } = await supabase
        .from("assistant_memory")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("entity_type", source.entity_type)
        .eq("entity_id", source.entity_id)
        .neq("id", memory_id)
        .limit(20);

      if (entityMatches) {
        for (const match of entityMatches) {
          const { error } = await supabase.from("memory_relationships").upsert(
            {
              source_memory_id: memory_id,
              target_memory_id: match.id,
              relationship_type: "related_to",
              strength: 0.85,
              metadata: { reason: "shared_entity", entity_type: source.entity_type, entity_id: source.entity_id },
            },
            { onConflict: "source_memory_id,target_memory_id,relationship_type" }
          );
          if (error) {
            console.error("Entity link error:", error.message);
            result.errors++;
          } else {
            result.entity_links++;
          }
        }
      }
    }

    // 2. Vector similarity linking (>0.80 but <0.92 — related but not duplicates)
    if (source.embedding) {
      const { data: simMatches } = await supabase.rpc("memory_vector_search", {
        query_embedding: source.embedding,
        ws_id: workspace_id,
        match_count: 15,
      });

      if (simMatches) {
        for (const match of simMatches) {
          if (match.id === memory_id) continue;
          const sim = match.similarity as number;

          // Skip duplicates (handled by merge system) and weak matches
          if (sim >= 0.92 || sim < 0.80) continue;

          const relType = sim >= 0.87 ? "supports" : "related_to";

          const { error } = await supabase.from("memory_relationships").upsert(
            {
              source_memory_id: memory_id,
              target_memory_id: match.id,
              relationship_type: relType,
              strength: parseFloat(sim.toFixed(3)),
              metadata: { reason: "vector_similarity", similarity: sim },
            },
            { onConflict: "source_memory_id,target_memory_id,relationship_type" }
          );
          if (error) {
            console.error("Similarity link error:", error.message);
            result.errors++;
          } else {
            result.similarity_links++;
          }
        }
      }
    }

    // 3. Tag overlap linking — find memories sharing 2+ tags
    if (source.tags && source.tags.length >= 2) {
      const { data: tagMatches } = await supabase
        .from("assistant_memory")
        .select("id, tags")
        .eq("workspace_id", workspace_id)
        .neq("id", memory_id)
        .overlaps("tags", source.tags)
        .limit(30);

      if (tagMatches) {
        for (const match of tagMatches) {
          const sharedTags = (match.tags || []).filter((t: string) => source.tags.includes(t));
          if (sharedTags.length < 2) continue;

          // Don't overwrite stronger relationships
          const { data: existing } = await supabase
            .from("memory_relationships")
            .select("strength")
            .eq("source_memory_id", memory_id)
            .eq("target_memory_id", match.id)
            .eq("relationship_type", "related_to")
            .maybeSingle();

          if (existing && existing.strength >= 0.6) continue;

          const tagStrength = Math.min(0.75, 0.4 + sharedTags.length * 0.1);
          await supabase.from("memory_relationships").upsert(
            {
              source_memory_id: memory_id,
              target_memory_id: match.id,
              relationship_type: "related_to",
              strength: tagStrength,
              metadata: { reason: "tag_overlap", shared_tags: sharedTags },
            },
            { onConflict: "source_memory_id,target_memory_id,relationship_type" }
          );
        }
      }
    }

    // Update related_memory_ids on the source memory for backward compat
    const { data: allLinks } = await supabase
      .from("memory_relationships")
      .select("target_memory_id")
      .eq("source_memory_id", memory_id)
      .order("strength", { ascending: false })
      .limit(10);

    if (allLinks && allLinks.length > 0) {
      await supabase
        .from("assistant_memory")
        .update({ related_memory_ids: allLinks.map((l: any) => l.target_memory_id) })
        .eq("id", memory_id);
    }

    console.log(`memory-linker: ${memory_id} → entity:${result.entity_links} sim:${result.similarity_links} err:${result.errors}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("memory-linker error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
