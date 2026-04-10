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

// Tool 1: search_memory
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
  }),
  handler: async (args: { query: string; origin_filter?: string; limit?: number }) => {
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
    });
    if (error) {
      return { content: [{ type: "text", text: `Search error: ${error.message}` }] };
    }
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No memories found matching your query." }] };
    }
    const results = data.map((m: any, i: number) =>
      `${i + 1}. [${m.origin}] ${m.content}\n   Tags: ${(m.tags || []).join(", ") || "none"} | Score: ${(m.rrf_score || 0).toFixed(4)}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `Found ${data.length} memories:\n\n${results}` }] };
  },
});

// Tool 2: save_memory
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
  }),
  handler: async (args: {
    content: string;
    source_agent?: string;
    tags?: string[];
    memory_type?: string;
    origin?: string;
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
    return { content: [{ type: "text", text: `Memory saved successfully. ID: ${data.id}` }] };
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
    version: "1.0.0",
    description: "MCP server for Mission Control Hub memory system. Connect from Claude Code, Cursor, or any MCP client.",
    tools: ["search_memory", "save_memory", "get_recent_memories", "save_daily_log"],
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
