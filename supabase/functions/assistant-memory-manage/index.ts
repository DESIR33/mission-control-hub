import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
  if (!key) {
    console.warn("No embedding API key set – skipping embedding generation");
    return null;
  }

  // Use OpenAI directly if OPENAI_API_KEY is set, otherwise route through OpenRouter
  const isOpenAI = !!Deno.env.get("OPENAI_API_KEY");
  const url = isOpenAI
    ? "https://api.openai.com/v1/embeddings"
    : "https://openrouter.ai/api/v1/embeddings";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    console.warn(`Embedding API error: ${res.status} – saving without embedding`);
    return null;
  }
  const data = await res.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, workspace_id } = body;

    switch (action) {
      case "create": {
        const embedding = await getEmbedding(body.content);
        const insertData: Record<string, unknown> = {
          workspace_id,
          content: body.content,
          origin: body.origin || "manual",
          tags: body.tags || [],
        };
        if (embedding) {
          insertData.embedding = `[${embedding.join(",")}]`;
        }
        if (body.agent_scope?.length) {
          insertData.agent_scope = body.agent_scope;
        }
        const { data, error } = await supabase
          .from("assistant_memory")
          .insert(insertData)
          .select("id, content, origin, tags, agent_scope, current_version, created_at, updated_at")
          .single();
        if (error) throw error;
        // Sync agent_scope junction table
        if (body.agent_scope?.length && data?.id) {
          const scopeRows = body.agent_scope.map((slug: string) => ({
            memory_id: data.id,
            agent_slug: slug,
          }));
          await supabase.from("memory_agent_scope").insert(scopeRows);
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "update": {
        // Create a version snapshot before updating
        await supabase.rpc("create_memory_version", {
          p_memory_id: body.id,
          p_changed_by: body.changed_by || "user",
          p_change_reason: body.change_reason || null,
        });

        const embedding = await getEmbedding(body.content);
        const updateData: Record<string, unknown> = {
          content: body.content,
          origin: body.origin,
          tags: body.tags || [],
          updated_at: new Date().toISOString(),
        };
        if (embedding) {
          updateData.embedding = `[${embedding.join(",")}]`;
        }
        if (body.agent_scope !== undefined) {
          updateData.agent_scope = body.agent_scope?.length ? body.agent_scope : null;
        }
        const { data, error } = await supabase
          .from("assistant_memory")
          .update(updateData)
          .eq("id", body.id)
          .select("id, content, origin, tags, agent_scope, current_version, created_at, updated_at")
          .single();
        if (error) throw error;
        // Sync agent_scope junction table
        if (body.agent_scope !== undefined) {
          await supabase.from("memory_agent_scope").delete().eq("memory_id", body.id);
          if (body.agent_scope?.length) {
            const scopeRows = body.agent_scope.map((slug: string) => ({
              memory_id: body.id,
              agent_slug: slug,
            }));
            await supabase.from("memory_agent_scope").insert(scopeRows);
          }
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "rollback": {
        // Rollback a memory to a specific version
        const { id: memoryId, version_number } = body;
        if (!memoryId || !version_number) {
          return new Response(
            JSON.stringify({ error: "Missing id or version_number" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Snapshot current state first
        await supabase.rpc("create_memory_version", {
          p_memory_id: memoryId,
          p_changed_by: body.changed_by || "user",
          p_change_reason: `Rollback to version ${version_number}`,
        });
        // Load the target version
        const { data: version, error: vError } = await supabase
          .from("memory_versions")
          .select("content, origin, tags, memory_type, confidence_score, importance_score, embedding")
          .eq("memory_id", memoryId)
          .eq("version_number", version_number)
          .single();
        if (vError) throw vError;
        // Apply the version
        const rollbackData: Record<string, unknown> = {
          content: version.content,
          origin: version.origin,
          tags: version.tags,
          memory_type: version.memory_type,
          confidence_score: version.confidence_score,
          importance_score: version.importance_score,
          updated_at: new Date().toISOString(),
        };
        if (version.embedding) {
          rollbackData.embedding = version.embedding;
        }
        const { data, error } = await supabase
          .from("assistant_memory")
          .update(rollbackData)
          .eq("id", memoryId)
          .select("id, content, origin, tags, current_version, created_at, updated_at")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "get_versions": {
        const { data, error } = await supabase
          .from("memory_versions")
          .select("id, version_number, content, origin, tags, memory_type, confidence_score, importance_score, changed_by, change_reason, created_at")
          .eq("memory_id", body.id)
          .order("version_number", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "delete": {
        const { error } = await supabase
          .from("assistant_memory")
          .delete()
          .eq("id", body.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "search": {
        const embedding = await getEmbedding(body.query);
        const embeddingStr = embedding ? `[${embedding.join(",")}]` : "";
        const { data, error } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: embeddingStr,
          query_text: body.query,
          ws_id: workspace_id,
          origin_filter: body.origin_filter || "any",
          match_count: body.limit || 10,
          agent_slug_filter: body.agent_slug_filter || null,
        });
        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
