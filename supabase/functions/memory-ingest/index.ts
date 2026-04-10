import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/api-key-auth.ts";

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

async function getEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;

  const isOpenAI = !!Deno.env.get("OPENAI_API_KEY");
  const url = isOpenAI
    ? "https://api.openai.com/v1/embeddings"
    : "https://openrouter.ai/api/v1/embeddings";

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0].embedding;
}

interface MemoryInput {
  content: string;
  source_agent?: string;
  tags?: string[];
  memory_type?: string;
  origin?: string;
  entity_type?: string;
  entity_id?: string;
  confidence?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Authenticate via API key
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return json({ error: auth.error }, 401);
  }

  if (!auth.permissions?.includes("memory:write")) {
    return json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Support single or batch
    const items: MemoryInput[] = Array.isArray(body.memories)
      ? body.memories
      : [body];

    if (items.length === 0 || items.length > 50) {
      return json({ error: "Submit between 1 and 50 memories per request" }, 400);
    }

    // Validate all items
    for (const item of items) {
      if (!item.content || typeof item.content !== "string" || item.content.trim().length < 3) {
        return json({ error: "Each memory must have content (min 3 chars)" }, 400);
      }
      if (item.content.length > 10000) {
        return json({ error: "Content must be under 10,000 characters" }, 400);
      }
    }

    const results: { id: string; status: string; content_preview: string }[] = [];

    for (const item of items) {
      const content = item.content.trim();
      const embedding = await getEmbedding(content);

      // Deduplication: check vector similarity > 0.95
      if (embedding) {
        const { data: similar } = await supabase.rpc("memory_vector_search", {
          query_embedding: `[${embedding.join(",")}]`,
          ws_id: auth.workspaceId,
          match_count: 1,
        });

        if (similar && similar.length > 0 && similar[0].similarity > 0.95) {
          results.push({
            id: similar[0].id,
            status: "duplicate_skipped",
            content_preview: content.slice(0, 80),
          });
          continue;
        }
      }

      const insertData: Record<string, unknown> = {
        workspace_id: auth.workspaceId,
        content,
        origin: item.origin || item.source_agent || "external",
        tags: item.tags || [],
        source_type: item.source_agent || "api",
        memory_type: item.memory_type || "semantic",
        confidence_score: item.confidence ?? 0.7,
        review_status: "approved",
        status: "active",
      };

      if (item.entity_type) insertData.entity_type = item.entity_type;
      if (item.entity_id) insertData.entity_id = item.entity_id;
      if (embedding) insertData.embedding = `[${embedding.join(",")}]`;

      const { data, error } = await supabase
        .from("assistant_memory")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("Insert error:", error);
        results.push({
          id: "",
          status: "error",
          content_preview: content.slice(0, 80),
        });
      } else {
        results.push({
          id: data.id,
          status: "created",
          content_preview: content.slice(0, 80),
        });

        // Trigger conflict detection asynchronously
        if (embedding) {
          try {
            fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-conflict-detector`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  memory_id: data.id,
                  workspace_id: auth.workspaceId,
                  content,
                  embedding: `[${embedding.join(",")}]`,
                  origin: item.origin || item.source_agent || "external",
                  confidence_score: item.confidence ?? 0.7,
                }),
              },
            ).catch((e) => console.error("Conflict detection fire-and-forget error:", e));
          } catch (e) {
            console.error("Failed to trigger conflict detection:", e);
          }
        }
      }
    }

    return json({
      ingested: results.filter((r) => r.status === "created").length,
      duplicates: results.filter((r) => r.status === "duplicate_skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error: unknown) {
    console.error("memory-ingest error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
