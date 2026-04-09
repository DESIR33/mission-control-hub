import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, workspace_id, limit = 10 } = await req.json();
    if (!query || !workspace_id) {
      return new Response(JSON.stringify({ error: "query and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "No embedding API key configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    const url = isOpenAI ? "https://api.openai.com/v1/embeddings" : "https://openrouter.ai/api/v1/embeddings";

    const embRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
    });

    if (!embRes.ok) {
      return new Response(JSON.stringify({ error: "Embedding generation failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embData = await embRes.json();
    const embedding = embData.data[0].embedding;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("memory_vector_search", {
      query_embedding: `[${embedding.join(",")}]`,
      ws_id: workspace_id,
      match_count: limit,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("search-memories error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
