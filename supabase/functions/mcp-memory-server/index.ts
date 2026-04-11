import { Hono } from "npm:hono@4.4.2";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";
import { z } from "npm:zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- API Key Auth Helper ---
async function hashKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveWorkspace(apiKey: string): Promise<string | null> {
  if (!apiKey || apiKey.length < 32) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const keyHash = await hashKey(apiKey);
  const { data } = await supabase
    .from("api_keys")
    .select("workspace_id, is_active, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  // Update last_used_at
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", keyHash).then(() => {});
  return data.workspace_id;
}

// --- Embedding Helper ---
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

// --- Supabase client factory ---
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// --- MCP Server ---
const mcp = new McpServer({
  name: "mch-memory-server",
  version: "1.0.0",
  schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
});

// We need workspace context per-request. Since mcp-lite doesn't natively support
// per-request context in tool handlers, we use a request-scoped variable.
let currentWorkspaceId: string | null = null;

// Tool 1: search_memory (with agent scoping)
mcp.tool("search_memory", {
  description:
    "Search the memory system using hybrid vector + full-text search. Returns the most relevant memories for the given query. Use this to find existing knowledge before saving new memories.",
  inputSchema: z.object({
    query: z.string().describe("Natural language search query"),
    origin_filter: z
      .string()
      .optional()
      .describe("Filter by origin: youtube, crm, email, strategy, preference, manual, best_practice, external, or 'any'"),
    limit: z.number().optional().describe("Max results (default 10, max 20)"),
    agent_id: z
      .string()
      .optional()
      .describe("Filter memories by agent scope. Returns this agent's private + all shared memories."),
  }),
  handler: async (args: { query: string; origin_filter?: string; limit?: number; agent_id?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const embedding = await getEmbedding(args.query);
    const embeddingStr = embedding ? `[${embedding.join(",")}]` : "[]";
    const { data, error } = await supabase.rpc("hybrid_memory_search", {
      query_embedding: embeddingStr,
      query_text: args.query,
      ws_id: currentWorkspaceId,
      origin_filter: args.origin_filter || "any",
      match_count: Math.min(args.limit || 10, 20),
      agent_id_filter: args.agent_id || null,
      include_shared: true,
    });
    if (error) {
      return { content: [{ type: "text", text: `Search error: ${error.message}` }] };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No memories found matching your query." }] };
    }
    const results = data.map((m: any, i: number) =>
      `${i + 1}. [${m.origin}] ${m.content}\n   Tags: ${(m.tags || []).join(", ") || "none"} | Score: ${(m.rrf_score || 0).toFixed(4)} | Agent: ${m.agent_id || "global"} | Visibility: ${m.visibility || "shared"}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `Found ${data.length} memories:\n\n${results}` }] };
  },
});

// Tool 2: save_memory (with agent scoping + retain strategy support)
mcp.tool("save_memory", {
  description:
    "Save a new memory to the long-term memory system. Automatically generates embeddings and checks for duplicates (>95% similarity). Use this to capture important facts, decisions, preferences, strategies, or learnings from your current session.",
  inputSchema: z.object({
    content: z.string().min(3).max(10000).describe("The memory content to save"),
    source_agent: z
      .string()
      .optional()
      .describe("Which AI tool is saving this (e.g. 'claude-code', 'cursor', 'chatgpt')"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
    memory_type: z
      .string()
      .optional()
      .describe("Type: semantic, episodic, preference, procedural, contextual"),
    origin: z
      .string()
      .optional()
      .describe("Origin category: strategy, preference, manual, best_practice, external"),
    agent_id: z
      .string()
      .optional()
      .describe("Agent ID for scoped memory. Use your agent identifier for private diary entries."),
    visibility: z
      .enum(["private", "shared"])
      .optional()
      .describe("Memory visibility: 'private' (only this agent) or 'shared' (all agents). Default: shared"),
    strategy: z
      .enum(["verbatim", "chunks", "summary", "atomic_facts"])
      .optional()
      .describe("Retain strategy: verbatim (store as-is), chunks (split into pieces), summary, atomic_facts. Default: verbatim"),
  }),
  handler: async (args: {
    content: string;
    source_agent?: string;
    tags?: string[];
    memory_type?: string;
    origin?: string;
    agent_id?: string;
    visibility?: "private" | "shared";
    strategy?: string;
  }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const content = args.content.trim();
    const embedding = await getEmbedding(content);

    // Dedup check
    if (embedding) {
      const { data: similar } = await supabase.rpc("memory_vector_search", {
        query_embedding: `[${embedding.join(",")}]`,
        ws_id: currentWorkspaceId,
        match_count: 1,
      });
      if (similar && similar.length > 0 && similar[0].similarity > 0.95) {
        return {
          content: [
            {
              type: "text",
              text: `Duplicate detected (${(similar[0].similarity * 100).toFixed(1)}% similar). Existing memory ID: ${similar[0].id}\nExisting: "${similar[0].content.slice(0, 200)}"`,
            },
          ],
        };
      }
    }

    const insertData: Record<string, unknown> = {
      workspace_id: currentWorkspaceId,
      content,
      origin: args.origin || "external",
      tags: args.tags || [],
      source_type: args.source_agent || "mcp",
      memory_type: args.memory_type || "semantic",
      confidence_score: 0.8,
      review_status: "approved",
      status: "active",
      agent_id: args.agent_id || "global",
      visibility: args.visibility || "shared",
    };
    if (embedding) insertData.embedding = `[${embedding.join(",")}]`;

    const { data, error } = await supabase
      .from("assistant_memory")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Save error: ${error.message}` }] };
    }
    return { content: [{ type: "text", text: `Memory saved successfully. ID: ${data.id}\nAgent: ${args.agent_id || "global"} | Visibility: ${args.visibility || "shared"}` }] };
  },
});

// Tool 3: get_recent_memories
mcp.tool("get_recent_memories", {
  description:
    "Retrieve the most recently created or updated memories. Useful for getting context on what the system knows without a specific search query.",
  inputSchema: z.object({
    limit: z.number().optional().describe("Number of memories to return (default 10, max 50)"),
    origin_filter: z.string().optional().describe("Filter by origin, or 'all' for everything"),
  }),
  handler: async (args: { limit?: number; origin_filter?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    let q = supabase
      .from("assistant_memory")
      .select("id, content, origin, tags, memory_type, created_at, updated_at")
      .eq("workspace_id", currentWorkspaceId)
      .order("updated_at", { ascending: false })
      .limit(Math.min(args.limit || 10, 50));

    if (args.origin_filter && args.origin_filter !== "all") {
      q = q.eq("origin", args.origin_filter);
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No memories found." }] };
    }
    const results = data.map((m: any, i: number) =>
      `${i + 1}. [${m.origin}] ${m.content}\n   Type: ${m.memory_type || "—"} | Tags: ${(m.tags || []).join(", ") || "none"} | Updated: ${m.updated_at}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `${data.length} recent memories:\n\n${results}` }] };
  },
});

// Tool 4: save_daily_log
mcp.tool("save_daily_log", {
  description:
    "Save an entry to today's daily log. Use this for session summaries, progress notes, decisions made, or anything that should be part of the daily record.",
  inputSchema: z.object({
    content: z.string().min(3).max(5000).describe("The log entry content"),
    source: z
      .string()
      .optional()
      .describe("Source of the log entry (e.g. 'claude-code', 'cursor', 'manual')"),
  }),
  handler: async (args: { content: string; source?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("assistant_daily_logs")
      .insert({
        workspace_id: currentWorkspaceId,
        content: args.content.trim(),
        source: args.source || "mcp",
      })
      .select("id, log_date")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    return {
      content: [
        { type: "text", text: `Daily log entry saved. ID: ${data.id}, Date: ${data.log_date}` },
      ],
    };
  },
});

// Tool 5: get_agent_diary (Feature 3)
mcp.tool("get_agent_diary", {
  description:
    "Retrieve recent diary entries for a specific agent. Returns the agent's private memories and learnings, ordered by most recent first.",
  inputSchema: z.object({
    agent_id: z.string().describe("The agent identifier (e.g. 'content-strategist', 'competitor-analyst')"),
    limit: z.number().optional().describe("Number of entries to return (default 20, max 50)"),
    include_shared: z.boolean().optional().describe("Also include shared memories from this agent (default true)"),
  }),
  handler: async (args: { agent_id: string; limit?: number; include_shared?: boolean }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    let q = supabase
      .from("assistant_memory")
      .select("id, content, origin, tags, memory_type, visibility, created_at, updated_at")
      .eq("workspace_id", currentWorkspaceId)
      .eq("agent_id", args.agent_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(Math.min(args.limit || 20, 50));

    if (args.include_shared === false) {
      q = q.eq("visibility", "private");
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: `No diary entries found for agent "${args.agent_id}".` }] };
    }
    const results = data.map((m: any, i: number) =>
      `${i + 1}. [${m.visibility}] ${m.content}\n   Type: ${m.memory_type} | Tags: ${(m.tags || []).join(", ") || "none"} | Created: ${m.created_at}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `${data.length} diary entries for "${args.agent_id}":\n\n${results}` }] };
  },
});

// Tool 6: promote_memory (Feature 3)
mcp.tool("promote_memory", {
  description:
    "Promote a private agent memory to shared visibility so all agents and users can access it. Use when an agent discovers something broadly useful.",
  inputSchema: z.object({
    memory_id: z.string().describe("The UUID of the memory to promote"),
  }),
  handler: async (args: { memory_id: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("assistant_memory")
      .update({ visibility: "shared", updated_at: new Date().toISOString() })
      .eq("id", args.memory_id)
      .eq("workspace_id", currentWorkspaceId)
      .select("id, content")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    return { content: [{ type: "text", text: `Memory promoted to shared visibility. ID: ${data.id}\nContent: "${data.content.slice(0, 200)}"` }] };
  },
});

// Tool 7: get_context_brief (Feature 7 - Context-Aware Routing)
mcp.tool("get_context_brief", {
  description:
    "Get a curated memory briefing for the current context. Assembles relevant memories from multiple strategies: pinned memories, agent diary, entity-related memories, and recent important memories. Use this at the start of a task instead of manually searching.",
  inputSchema: z.object({
    agent_id: z.string().optional().describe("Your agent identifier for scoped retrieval"),
    context: z.string().optional().describe("Brief description of current task/conversation context for relevance matching"),
    entity_type: z.string().optional().describe("Entity type to focus on (e.g. 'deal', 'video', 'contact')"),
    entity_id: z.string().optional().describe("Specific entity UUID to retrieve memories about"),
  }),
  handler: async (args: { agent_id?: string; context?: string; entity_type?: string; entity_id?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const sections: string[] = [];

    // 1. Pinned memories (always include)
    const { data: pinned } = await supabase
      .from("assistant_memory")
      .select("id, content, origin, tags")
      .eq("workspace_id", currentWorkspaceId)
      .eq("is_pinned", true)
      .eq("status", "active")
      .limit(5);

    if (pinned && pinned.length > 0) {
      sections.push("## Pinned Memories\n" + pinned.map((m: any) => `- ${m.content}`).join("\n"));
    }

    // 2. Agent diary (recent entries)
    if (args.agent_id) {
      const { data: diary } = await supabase
        .from("assistant_memory")
        .select("id, content, created_at")
        .eq("workspace_id", currentWorkspaceId)
        .eq("agent_id", args.agent_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (diary && diary.length > 0) {
        sections.push("## Your Recent Diary\n" + diary.map((m: any) => `- ${m.content}`).join("\n"));
      }
    }

    // 3. Entity-scoped memories
    if (args.entity_type && args.entity_id) {
      const { data: entityMems } = await supabase
        .from("assistant_memory")
        .select("id, content, origin")
        .eq("workspace_id", currentWorkspaceId)
        .eq("entity_type", args.entity_type)
        .eq("entity_id", args.entity_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (entityMems && entityMems.length > 0) {
        sections.push(`## ${args.entity_type} Memories\n` + entityMems.map((m: any) => `- [${m.origin}] ${m.content}`).join("\n"));
      }
    }

    // 4. Context-relevant via hybrid search
    if (args.context) {
      const embedding = await getEmbedding(args.context);
      if (embedding) {
        const { data: relevant } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: `[${embedding.join(",")}]`,
          query_text: args.context,
          ws_id: currentWorkspaceId,
          origin_filter: "any",
          match_count: 8,
          agent_id_filter: args.agent_id || null,
          include_shared: true,
        });
        if (relevant && relevant.length > 0) {
          sections.push("## Context-Relevant Memories\n" + relevant.map((m: any) => `- [${m.origin}] ${m.content} (score: ${(m.rrf_score || 0).toFixed(3)})`).join("\n"));
        }
      }
    }

    // 5. Mental models (if any exist)
    const { data: models } = await supabase
      .from("mental_models")
      .select("name, current_content")
      .eq("workspace_id", currentWorkspaceId)
      .eq("status", "active")
      .limit(3);

    if (models && models.length > 0) {
      sections.push("## Mental Models\n" + models.map((m: any) => `### ${m.name}\n${m.current_content || "(empty)"}`).join("\n\n"));
    }

    if (sections.length === 0) {
      return { content: [{ type: "text", text: "No relevant memories found for this context." }] };
    }

    return { content: [{ type: "text", text: `# Memory Briefing\n\n${sections.join("\n\n")}` }] };
  },
});

// Tool 8: reflect_memory (Feature 1 - Mental Models)
mcp.tool("reflect_memory", {
  description:
    "Trigger reflection on a topic to create or update a mental model. Gathers related memories and synthesizes them into a higher-order knowledge structure. Use periodically to consolidate accumulated knowledge into reusable insights.",
  inputSchema: z.object({
    topic: z.string().describe("The topic or name for the mental model (e.g. 'Audience Preferences', 'Pricing Strategy')"),
    model_type: z.string().optional().describe("Type of model: general, strategy, preference, process, entity_profile"),
    description: z.string().optional().describe("Brief description of what this model should capture"),
  }),
  handler: async (args: { topic: string; model_type?: string; description?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();

    // Check if mental model already exists
    const { data: existing } = await supabase
      .from("mental_models")
      .select("id, name, current_content, version, source_memory_ids")
      .eq("workspace_id", currentWorkspaceId)
      .eq("name", args.topic)
      .eq("status", "active")
      .maybeSingle();

    // Gather related memories via search
    const embedding = await getEmbedding(args.topic + " " + (args.description || ""));
    let relatedMemories: any[] = [];
    if (embedding) {
      const { data } = await supabase.rpc("hybrid_memory_search", {
        query_embedding: `[${embedding.join(",")}]`,
        query_text: args.topic,
        ws_id: currentWorkspaceId,
        origin_filter: "any",
        match_count: 20,
      });
      relatedMemories = data || [];
    }

    if (relatedMemories.length === 0) {
      return { content: [{ type: "text", text: `No related memories found for topic "${args.topic}". Save some memories first, then reflect.` }] };
    }

    const memoryIds = relatedMemories.map((m: any) => m.id);
    const memoryContents = relatedMemories.map((m: any) => m.content);

    // Synthesize using LLM (via OpenRouter/OpenAI)
    const llmKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
    if (!llmKey) {
      return { content: [{ type: "text", text: "Error: No LLM API key configured for reflection." }] };
    }

    const isOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    const llmUrl = isOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const systemPrompt = `You are a knowledge synthesizer. Given a collection of raw memories/observations about a topic, produce a concise, structured mental model that captures the key insights, patterns, and relationships. The output should be authoritative and actionable — something an AI agent can use as reliable context.

Format your response as structured markdown with clear sections.${existing?.current_content ? `\n\nPrevious version of this mental model:\n${existing.current_content}\n\nUpdate and improve it with the new observations.` : ""}`;

    const userPrompt = `Topic: ${args.topic}${args.description ? `\nDescription: ${args.description}` : ""}

Related memories (${relatedMemories.length} observations):
${memoryContents.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}

Synthesize these into a concise mental model:`;

    const llmRes = await fetch(llmUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${llmKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: isOpenAI ? "gpt-4o-mini" : "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!llmRes.ok) {
      return { content: [{ type: "text", text: `LLM error: ${llmRes.statusText}` }] };
    }

    const llmData = await llmRes.json();
    const synthesized = llmData.choices?.[0]?.message?.content || "";

    if (!synthesized) {
      return { content: [{ type: "text", text: "Error: LLM returned empty response." }] };
    }

    // Generate embedding for the mental model
    const modelEmbedding = await getEmbedding(synthesized);

    if (existing) {
      // Update existing model
      const newVersion = (existing.version || 1) + 1;

      // Save history
      await supabase.from("mental_model_history").insert({
        model_id: existing.id,
        version: existing.version,
        content: existing.current_content || "",
        diff_summary: `Updated with ${relatedMemories.length} new observations`,
        source_memory_ids: memoryIds,
      });

      // Update model
      const updateData: Record<string, unknown> = {
        current_content: synthesized,
        version: newVersion,
        source_memory_ids: memoryIds,
        last_reflected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (modelEmbedding) updateData.embedding = `[${modelEmbedding.join(",")}]`;

      await supabase
        .from("mental_models")
        .update(updateData)
        .eq("id", existing.id);

      return {
        content: [{
          type: "text",
          text: `Mental model "${args.topic}" updated to v${newVersion}.\nBased on ${relatedMemories.length} memories.\n\n${synthesized}`,
        }],
      };
    } else {
      // Create new model
      const insertData: Record<string, unknown> = {
        workspace_id: currentWorkspaceId,
        name: args.topic,
        model_type: args.model_type || "general",
        description: args.description || null,
        current_content: synthesized,
        source_memory_ids: memoryIds,
        version: 1,
        last_reflected_at: new Date().toISOString(),
      };
      if (modelEmbedding) insertData.embedding = `[${modelEmbedding.join(",")}]`;

      const { data, error } = await supabase
        .from("mental_models")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error creating mental model: ${error.message}` }] };
      }

      // Save initial history
      await supabase.from("mental_model_history").insert({
        model_id: data.id,
        version: 1,
        content: synthesized,
        diff_summary: `Initial creation from ${relatedMemories.length} observations`,
        source_memory_ids: memoryIds,
      });

      return {
        content: [{
          type: "text",
          text: `Mental model "${args.topic}" created (v1).\nID: ${data.id}\nBased on ${relatedMemories.length} memories.\n\n${synthesized}`,
        }],
      };
    }
  },
});

// Tool 9: list_mental_models (Feature 1)
mcp.tool("list_mental_models", {
  description:
    "List all active mental models in the workspace. Mental models are synthesized knowledge structures created by the reflect process.",
  inputSchema: z.object({
    model_type: z.string().optional().describe("Filter by type: general, strategy, preference, process, entity_profile"),
  }),
  handler: async (args: { model_type?: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    let q = supabase
      .from("mental_models")
      .select("id, name, model_type, description, version, last_reflected_at, updated_at")
      .eq("workspace_id", currentWorkspaceId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (args.model_type) {
      q = q.eq("model_type", args.model_type);
    }

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No mental models found. Use reflect_memory to create one." }] };
    }
    const results = data.map((m: any, i: number) =>
      `${i + 1}. **${m.name}** (v${m.version})\n   Type: ${m.model_type} | ${m.description || "No description"}\n   Last reflected: ${m.last_reflected_at || "never"}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `${data.length} mental models:\n\n${results}` }] };
  },
});

// Tool 10: get_mental_model (Feature 1)
mcp.tool("get_mental_model", {
  description:
    "Retrieve the full content of a specific mental model by name. Returns the synthesized knowledge and metadata.",
  inputSchema: z.object({
    name: z.string().describe("The name of the mental model to retrieve"),
  }),
  handler: async (args: { name: string }) => {
    if (!currentWorkspaceId) {
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("mental_models")
      .select("*")
      .eq("workspace_id", currentWorkspaceId)
      .eq("name", args.name)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    if (!data) {
      return { content: [{ type: "text", text: `Mental model "${args.name}" not found.` }] };
    }
    return {
      content: [{
        type: "text",
        text: `# ${data.name} (v${data.version})\nType: ${data.model_type} | Last reflected: ${data.last_reflected_at || "never"}\n\n${data.current_content || "(empty)"}`,
      }],
    };
  },
});

// Resource: list_memory_tags
mcp.resource("memory://tags", {
  name: "list_memory_tags",
  description: "Lists all unique tags used across memories in this workspace for discoverability",
  mimeType: "application/json",
  handler: async () => {
    if (!currentWorkspaceId) {
      return { text: JSON.stringify({ error: "Not authenticated" }) };
    }
    const supabase = getSupabase();
    const { data } = await supabase
      .from("assistant_memory")
      .select("tags")
      .eq("workspace_id", currentWorkspaceId)
      .not("tags", "is", null);

    const tagSet = new Set<string>();
    (data || []).forEach((row: any) => {
      (row.tags || []).forEach((t: string) => tagSet.add(t));
    });
    const tags = Array.from(tagSet).sort();
    return { text: JSON.stringify({ tags, count: tags.length }) };
  },
});

// --- HTTP Transport & Hono ---
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

const app = new Hono();

// Auth middleware: extract API key and resolve workspace
app.use("*", async (c, next) => {
  // Skip CORS preflight
  if (c.req.method === "OPTIONS") return next();

  const authHeader = c.req.header("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey) {
    return c.json({ error: "Missing API key. Pass Bearer token in Authorization header." }, 401);
  }

  const wsId = await resolveWorkspace(apiKey);
  if (!wsId) {
    return c.json({ error: "Invalid or expired API key" }, 401);
  }

  currentWorkspaceId = wsId;
  await next();
  currentWorkspaceId = null;
});

// Info endpoint
app.get("/", (c) => {
  return c.json({
    name: "MCH Memory MCP Server",
    version: "2.0.0",
    description: "MCP server for Mission Control Hub memory system. Connect from Claude Code, Cursor, or any MCP client. Supports agent scoping, mental models, context briefings, and retain strategies.",
    tools: [
      "search_memory",
      "save_memory",
      "get_recent_memories",
      "save_daily_log",
      "get_agent_diary",
      "promote_memory",
      "get_context_brief",
      "reflect_memory",
      "list_mental_models",
      "get_mental_model",
    ],
    resources: ["memory://tags"],
    auth: "Bearer API key required (generate in Settings → API Keys)",
  });
});

// MCP endpoint
app.all("/mcp", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

Deno.serve(app.fetch);
