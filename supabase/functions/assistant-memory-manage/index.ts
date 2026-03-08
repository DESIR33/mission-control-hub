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
        const { data, error } = await supabase
          .from("assistant_memory")
          .insert({
            workspace_id,
            content: body.content,
            origin: body.origin || "manual",
            tags: body.tags || [],
            embedding: `[${embedding.join(",")}]`,
          })
          .select("id, content, origin, tags, created_at, updated_at")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "update": {
        const embedding = await getEmbedding(body.content);
        const { data, error } = await supabase
          .from("assistant_memory")
          .update({
            content: body.content,
            origin: body.origin,
            tags: body.tags || [],
            embedding: `[${embedding.join(",")}]`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.id)
          .select("id, content, origin, tags, created_at, updated_at")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
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
        const { data, error } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: `[${embedding.join(",")}]`,
          query_text: body.query,
          ws_id: workspace_id,
          origin_filter: body.origin_filter || "any",
          match_count: body.limit || 10,
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
