import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/api-key-auth.ts";
import { applyRetainStrategy, getSummaryPrompt, getAtomicFactsPrompt, getDeltaPrompt, type RetainStrategy } from "../_shared/retain-strategies.ts";
import { recordAudit } from "../_shared/audit.ts";

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
  strategy?: RetainStrategy;
  agent_id?: string;
  visibility?: "private" | "shared";
  chunk_size?: number;
  chunk_overlap?: number;
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
    const startTime = performance.now();

    for (const item of items) {
      const content = item.content.trim();
      const strategy: RetainStrategy = item.strategy || "verbatim";

      // Apply retain strategy to get content pieces
      const retained = applyRetainStrategy(content, strategy, {
        chunk_size: item.chunk_size,
        overlap: item.chunk_overlap,
      });

      // For delta strategy, find similar memories and compute delta
      let contentPieces = retained.contents;
      if (strategy === "delta") {
        const embedding = await getEmbedding(content);
        if (embedding) {
          const { data: similar } = await supabase.rpc("memory_vector_search", {
            query_embedding: `[${embedding.join(",")}]`,
            ws_id: auth.workspaceId,
            match_count: 5,
          });
          if (similar && similar.length > 0) {
            const existingContents = similar.map((s: { content: string }) => s.content);
            // For delta, we pass through as-is but mark metadata
            // Full delta extraction requires LLM - stored as single item for now
            contentPieces = [content];
          }
        }
      }

      // For append strategy, find the most similar memory and append
      if (strategy === "append") {
        const embedding = await getEmbedding(content);
        if (embedding) {
          const { data: similar } = await supabase.rpc("memory_vector_search", {
            query_embedding: `[${embedding.join(",")}]`,
            ws_id: auth.workspaceId,
            match_count: 1,
          });
          if (similar && similar.length > 0 && similar[0].similarity > 0.85) {
            // Append to existing memory
            const appendedContent = `${similar[0].content}\n\n${content}`;
            const newEmbedding = await getEmbedding(appendedContent);
            const updateData: Record<string, unknown> = {
              content: appendedContent,
              updated_at: new Date().toISOString(),
            };
            if (newEmbedding) updateData.embedding = `[${newEmbedding.join(",")}]`;

            const { error } = await supabase
              .from("assistant_memory")
              .update(updateData)
              .eq("id", similar[0].id);

            if (error) {
              results.push({ id: "", status: "error", content_preview: content.slice(0, 80) });
            } else {
              results.push({ id: similar[0].id, status: "appended", content_preview: content.slice(0, 80) });
            }
            continue;
          }
        }
        // If no similar memory found, fall through to create new
        contentPieces = [content];
      }

      // Process each content piece
      for (let chunkIdx = 0; chunkIdx < contentPieces.length; chunkIdx++) {
        const piece = contentPieces[chunkIdx];
        const embedding = await getEmbedding(piece);

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
              content_preview: piece.slice(0, 80),
            });
            continue;
          }
        }

        const insertData: Record<string, unknown> = {
          workspace_id: auth.workspaceId,
          content: piece,
          origin: item.origin || item.source_agent || "external",
          tags: item.tags || [],
          source_type: item.source_agent || "api",
          memory_type: item.memory_type || "semantic",
          confidence_score: item.confidence ?? 0.7,
          review_status: "approved",
          status: "active",
          agent_id: item.agent_id || "global",
          visibility: item.visibility || "shared",
          observation_scope: "raw",
        };

        if (item.entity_type) insertData.entity_type = item.entity_type;
        if (item.entity_id) insertData.entity_id = item.entity_id;
        if (embedding) insertData.embedding = `[${embedding.join(",")}]`;
        if (contentPieces.length > 1) {
          insertData.tags = [...(item.tags || []), `chunk:${chunkIdx + 1}/${contentPieces.length}`];
        }

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
            content_preview: piece.slice(0, 80),
          });
        } else {
          results.push({
            id: data.id,
            status: "created",
            content_preview: piece.slice(0, 80),
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
                    content: piece,
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

          // Fire memory.created event for webhooks (Feature 6)
          try {
            fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/memory-webhook-dispatcher`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  workspace_id: auth.workspaceId,
                  event_type: "memory.created",
                  payload: {
                    memory_id: data.id,
                    content_preview: piece.slice(0, 200),
                    origin: item.origin || "external",
                    strategy,
                    agent_id: item.agent_id || "global",
                    tags: item.tags || [],
                  },
                }),
              },
            ).catch(() => {});
          } catch (_) {}
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Audit log (Feature 9)
    recordAudit(supabase, {
      workspace_id: auth.workspaceId!,
      action: "memory.ingest",
      target_type: "memory",
      actor_type: "api",
      actor_id: auth.apiKeyId,
      metadata: {
        count: items.length,
        ingested: results.filter((r) => r.status === "created").length,
        duplicates: results.filter((r) => r.status === "duplicate_skipped").length,
        strategy: items[0]?.strategy || "verbatim",
      },
    }, durationMs);

    return json({
      ingested: results.filter((r) => r.status === "created").length,
      duplicates: results.filter((r) => r.status === "duplicate_skipped").length,
      appended: results.filter((r) => r.status === "appended").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error: unknown) {
    console.error("memory-ingest error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
