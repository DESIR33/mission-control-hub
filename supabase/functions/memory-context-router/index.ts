/**
 * Feature 7: Context-Aware Memory Routing
 * Assembles a curated memory package based on who's asking, what's discussed, and when.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/api-key-auth.ts";
import { recordAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0].embedding;
}

interface ContextRequest {
  agent_id?: string;
  context?: string;
  entity_type?: string;
  entity_id?: string;
  folder_id?: string;
  max_tokens?: number;
}

interface MemorySection {
  section: string;
  memories: Array<{ id: string; content: string; origin: string; score?: number }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return json({ error: auth.error }, 401);
  }

  const startTime = performance.now();

  try {
    const body: ContextRequest = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sections: MemorySection[] = [];

    // 1. Pinned memories (always include)
    const { data: pinned } = await supabase
      .from("assistant_memory")
      .select("id, content, origin")
      .eq("workspace_id", auth.workspaceId)
      .eq("is_pinned", true)
      .eq("status", "active")
      .limit(5);

    if (pinned && pinned.length > 0) {
      sections.push({
        section: "pinned",
        memories: pinned.map((m: any) => ({ id: m.id, content: m.content, origin: m.origin })),
      });
    }

    // 2. Agent diary entries
    if (body.agent_id) {
      const { data: diary } = await supabase
        .from("assistant_memory")
        .select("id, content, origin")
        .eq("workspace_id", auth.workspaceId)
        .eq("agent_id", body.agent_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);

      if (diary && diary.length > 0) {
        sections.push({
          section: "agent_diary",
          memories: diary.map((m: any) => ({ id: m.id, content: m.content, origin: m.origin })),
        });
      }
    }

    // 3. Entity-scoped memories
    if (body.entity_type && body.entity_id) {
      const { data: entityMems } = await supabase
        .from("assistant_memory")
        .select("id, content, origin")
        .eq("workspace_id", auth.workspaceId)
        .eq("entity_type", body.entity_type)
        .eq("entity_id", body.entity_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (entityMems && entityMems.length > 0) {
        sections.push({
          section: "entity",
          memories: entityMems.map((m: any) => ({ id: m.id, content: m.content, origin: m.origin })),
        });
      }

      // Also check entity aliases
      const { data: aliases } = await supabase
        .from("entity_aliases")
        .select("alias")
        .eq("workspace_id", auth.workspaceId)
        .eq("entity_type", body.entity_type)
        .eq("entity_id", body.entity_id);

      if (aliases && aliases.length > 0 && body.context) {
        // Enrich context with alias information for better search
        body.context += " " + aliases.map((a: any) => a.alias).join(" ");
      }
    }

    // 4. Context-relevant via hybrid search
    if (body.context) {
      const embedding = await getEmbedding(body.context);
      if (embedding) {
        const { data: relevant } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: `[${embedding.join(",")}]`,
          query_text: body.context,
          ws_id: auth.workspaceId,
          origin_filter: "any",
          match_count: 10,
          agent_id_filter: body.agent_id || null,
          include_shared: true,
        });

        if (relevant && relevant.length > 0) {
          sections.push({
            section: "context_relevant",
            memories: relevant.map((m: any) => ({
              id: m.id,
              content: m.content,
              origin: m.origin,
              score: m.rrf_score,
            })),
          });
        }
      }
    }

    // 5. Mental models
    const { data: models } = await supabase
      .from("mental_models")
      .select("id, name, current_content, model_type")
      .eq("workspace_id", auth.workspaceId)
      .eq("status", "active")
      .limit(3);

    if (models && models.length > 0) {
      sections.push({
        section: "mental_models",
        memories: models.map((m: any) => ({
          id: m.id,
          content: `[${m.name}] ${m.current_content || ""}`,
          origin: "mental_model",
        })),
      });
    }

    // 6. Folder-scoped memories
    if (body.folder_id) {
      const { data: folderMems } = await supabase
        .from("memory_attachments")
        .select("memory_id")
        .eq("workspace_id", auth.workspaceId)
        .eq("folder_id", body.folder_id);

      if (folderMems && folderMems.length > 0) {
        const memIds = folderMems.map((f: any) => f.memory_id).filter(Boolean);
        if (memIds.length > 0) {
          const { data: mems } = await supabase
            .from("assistant_memory")
            .select("id, content, origin")
            .in("id", memIds)
            .eq("status", "active")
            .limit(10);

          if (mems && mems.length > 0) {
            sections.push({
              section: "folder",
              memories: mems.map((m: any) => ({ id: m.id, content: m.content, origin: m.origin })),
            });
          }
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Audit
    recordAudit(supabase, {
      workspace_id: auth.workspaceId!,
      action: "memory.context_route",
      target_type: "context_brief",
      actor_type: "api",
      actor_id: body.agent_id || auth.apiKeyId,
      metadata: {
        sections_returned: sections.length,
        total_memories: sections.reduce((sum, s) => sum + s.memories.length, 0),
        has_context: !!body.context,
        has_entity: !!body.entity_type,
      },
    }, durationMs);

    return json({
      sections,
      total_memories: sections.reduce((sum, s) => sum + s.memories.length, 0),
      processing_ms: durationMs,
    });
  } catch (error) {
    console.error("Context router error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
