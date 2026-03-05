import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const toolDefinitions = [
  {
    name: "memory_search",
    description:
      "Search long-term memory using hybrid vector + keyword search. Call before answering questions about past context, decisions, or observations.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        origin_filter: {
          type: "string",
          enum: ["youtube", "crm", "email", "strategy", "preference", "manual", "any"],
          default: "any",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "save_memory",
    description:
      "Save an important fact, observation, or decision to long-term memory.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        origin: {
          type: "string",
          enum: ["youtube", "crm", "email", "strategy", "preference", "manual"],
        },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["content", "origin"],
    },
  },
  {
    name: "save_daily_log",
    description:
      "Append a note to today's log. Call after reviewing service data or completing a task.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        source: {
          type: "string",
          enum: ["youtube", "crm", "email", "chat", "manual"],
        },
      },
      required: ["content", "source"],
    },
  },
  {
    name: "save_service_snapshot",
    description: "Save a summary snapshot of a service's current state.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", enum: ["youtube", "crm", "email"] },
        summary: { type: "string" },
        raw_data: { type: "object" },
      },
      required: ["service", "summary"],
    },
  },
  {
    name: "get_service_snapshot",
    description: "Retrieve the most recent saved snapshot for a service.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", enum: ["youtube", "crm", "email"] },
      },
      required: ["service"],
    },
  },
  {
    name: "get_daily_logs",
    description: "Retrieve daily logs for a date range.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD, optional" },
        source_filter: {
          type: "string",
          enum: ["youtube", "crm", "email", "chat", "manual", "all"],
          default: "all",
        },
      },
      required: ["start_date"],
    },
  },
];

async function getEmbedding(text: string): Promise<number[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function handleToolCall(
  toolName: string,
  toolInput: any,
  workspaceId: string,
  supabase: any
): Promise<any> {
  switch (toolName) {
    case "memory_search": {
      try {
        const embedding = await getEmbedding(toolInput.query);
        const { data, error } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: `[${embedding.join(",")}]`,
          query_text: toolInput.query,
          ws_id: workspaceId,
          origin_filter: toolInput.origin_filter || "any",
          match_count: 5,
        });
        if (error) return { error: error.message };
        return { results: data || [] };
      } catch (e) {
        return { results: [], error: e.message };
      }
    }
    case "save_memory": {
      try {
        const embedding = await getEmbedding(toolInput.content);
        const { error } = await supabase.from("assistant_memory").insert({
          workspace_id: workspaceId,
          content: toolInput.content,
          origin: toolInput.origin,
          tags: toolInput.tags || [],
          embedding: `[${embedding.join(",")}]`,
        });
        if (error) return { error: error.message };
        return { success: true };
      } catch (e) {
        return { error: e.message };
      }
    }
    case "save_daily_log": {
      const { error } = await supabase.from("assistant_daily_logs").insert({
        workspace_id: workspaceId,
        content: toolInput.content,
        source: toolInput.source,
      });
      if (error) return { error: error.message };
      return { success: true };
    }
    case "save_service_snapshot": {
      const { error } = await supabase
        .from("assistant_service_snapshots")
        .insert({
          workspace_id: workspaceId,
          service: toolInput.service,
          summary: toolInput.summary,
          raw_data: toolInput.raw_data || null,
        });
      if (error) return { error: error.message };
      return { success: true };
    }
    case "get_service_snapshot": {
      const { data, error } = await supabase
        .from("assistant_service_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("service", toolInput.service)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return { snapshot: null };
      return { snapshot: data };
    }
    case "get_daily_logs": {
      let query = supabase
        .from("assistant_daily_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("log_date", toolInput.start_date)
        .order("created_at", { ascending: true });
      if (toolInput.end_date)
        query = query.lte("log_date", toolInput.end_date);
      if (toolInput.source_filter && toolInput.source_filter !== "all") {
        query = query.eq("source", toolInput.source_filter);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { logs: data || [] };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function buildSystemPrompt(
  workspaceId: string,
  userMessage: string,
  supabase: any
): Promise<{ prompt: string; memoriesUsed: any[] }> {
  let memories: any[] = [];
  try {
    const embedding = await getEmbedding(userMessage);
    const { data } = await supabase.rpc("hybrid_memory_search", {
      query_embedding: `[${embedding.join(",")}]`,
      query_text: userMessage,
      ws_id: workspaceId,
      origin_filter: "any",
      match_count: 5,
    });
    memories = data || [];
  } catch (e) {
    console.error("Memory search failed:", e);
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: logs } = await supabase
    .from("assistant_daily_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("log_date", yesterday)
    .order("created_at", { ascending: true });

  const todayLogs = (logs || []).filter((l: any) => l.log_date === today);
  const yesterdayLogs = (logs || []).filter((l: any) => l.log_date === yesterday);

  const services = ["youtube", "crm", "email"];
  const snapshots: Record<string, any> = {};
  for (const svc of services) {
    const { data } = await supabase
      .from("assistant_service_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("service", svc)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) snapshots[svc] = data;
  }

  const memorySection =
    memories.length > 0
      ? memories.map((m: any) => `[${m.origin}] ${m.content}`).join("\n")
      : "No relevant memories found.";

  const formatLogs = (entries: any[]) =>
    entries.length > 0
      ? entries.map((l: any) => `[${l.source}] ${l.content}`).join("\n")
      : "No entries.";

  const snapshotSection = services
    .map((svc) => {
      const s = snapshots[svc];
      if (!s) return `${svc}: No snapshot available.`;
      return `${svc} (as of ${s.snapshot_date}): ${s.summary}`;
    })
    .join("\n");

  const prompt = `You are a persistent AI business assistant for a YouTube content creator and entrepreneur.
You have access to their YouTube channel, CRM, and email through connected services.
You have a long-term memory system. Use it aggressively.

=== LONG-TERM MEMORY (retrieved for this conversation) ===
${memorySection}

=== TODAY'S LOG ===
${formatLogs(todayLogs)}

=== YESTERDAY'S LOG ===
${formatLogs(yesterdayLogs)}

=== LATEST SERVICE SNAPSHOTS ===
${snapshotSection}

---
Behavior Rules:
1. When the user shares a decision, preference, or important fact → call save_memory immediately.
2. When the user asks about something that may have come up before → call memory_search first.
3. After querying a live service (YouTube, CRM, email), write a log entry with key observations using save_daily_log.
4. When you notice a pattern across services, save it as a long-term memory with origin='strategy'.
5. If a service snapshot is older than 24 hours and the question is service-specific, proactively mention the snapshot may be stale.
6. Never say "I don't have access to previous conversations." You have memory. Use it.
7. Be direct and action-oriented. This is a power-user tool.`;

  return { prompt, memoriesUsed: memories };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, message, workspace_id } = await req.json();
    if (!session_id || !message || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();

    // Save user message
    await supabase.from("assistant_conversations").insert({
      workspace_id,
      session_id,
      role: "user",
      content: message,
    });

    // Build system prompt with context
    const { prompt: systemPrompt, memoriesUsed } = await buildSystemPrompt(
      workspace_id,
      message,
      supabase
    );

    // Load conversation history (last 20 user/assistant messages)
    const { data: history } = await supabase
      .from("assistant_conversations")
      .select("role, content")
      .eq("session_id", session_id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(20);

    const claudeMessages = (history || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Tool call loop
    let messages = claudeMessages;
    let finalResponse = "";
    let toolCallsMade: string[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const claudeRes = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools: toolDefinitions,
          messages,
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        console.error("Claude API error:", errText);
        throw new Error(`Claude API error: ${claudeRes.status}`);
      }

      const claudeData = await claudeRes.json();
      const toolUseBlocks = claudeData.content.filter(
        (b: any) => b.type === "tool_use"
      );
      const textBlocks = claudeData.content.filter(
        (b: any) => b.type === "text"
      );

      if (textBlocks.length > 0) {
        finalResponse = textBlocks.map((b: any) => b.text).join("");
      }

      if (claudeData.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        break;
      }

      // Execute tool calls
      const toolResults: any[] = [];
      for (const toolBlock of toolUseBlocks) {
        const result = await handleToolCall(
          toolBlock.name,
          toolBlock.input,
          workspace_id,
          supabase
        );
        toolCallsMade.push(toolBlock.name);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      }

      // Continue conversation with tool results
      messages = [
        ...messages,
        { role: "assistant", content: claudeData.content },
        { role: "user", content: toolResults },
      ];
    }

    // Save assistant response
    await supabase.from("assistant_conversations").insert({
      workspace_id,
      session_id,
      role: "assistant",
      content: finalResponse,
      metadata: {
        memories_used: memoriesUsed.length,
        tools_called: toolCallsMade,
      },
    });

    return new Response(
      JSON.stringify({
        response: finalResponse,
        memories_used: memoriesUsed,
        tools_called: toolCallsMade,
        session_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
