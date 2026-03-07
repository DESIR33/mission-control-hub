import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "memory_search",
      description:
        "Search long-term memory using hybrid vector + keyword search. Call before answering questions about past context, decisions, or observations.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description:
        "Save an important fact, observation, or decision to long-term memory.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "save_daily_log",
      description:
        "Append a note to today's log. Call after reviewing service data or completing a task.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "save_service_snapshot",
      description: "Save a summary snapshot of a service's current state.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["youtube", "crm", "email"] },
          summary: { type: "string" },
          raw_data: { type: "object" },
        },
        required: ["service", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_snapshot",
      description: "Retrieve the most recent saved snapshot for a service.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["youtube", "crm", "email"] },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_logs",
      description: "Retrieve daily logs for a date range.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description:
        "Delegate a task to a specialized AI agent. Use this when the user asks for deep analysis of competitors, content strategy, growth optimization, audience insights, or revenue optimization. Available agents: competitor-analyst, content-strategist, growth-optimizer, audience-analyst, revenue-optimizer. Use 'auto' to let the system choose.",
      parameters: {
        type: "object",
        properties: {
          agent_slug: {
            type: "string",
            enum: [
              "auto",
              "competitor-analyst",
              "content-strategist",
              "growth-optimizer",
              "audience-analyst",
              "revenue-optimizer",
            ],
            description: "Which agent to delegate to, or 'auto' for automatic routing",
          },
          message: {
            type: "string",
            description: "The task or question to send to the agent",
          },
        },
        required: ["agent_slug", "message"],
      },
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
      } catch (e: unknown) {
        return { results: [], error: (e as Error).message };
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
      } catch (e: unknown) {
        return { error: (e as Error).message };
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
    case "delegate_to_agent": {
      try {
        const orchestratorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-orchestrator`;
        const res = await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            agent_slug: toolInput.agent_slug || "auto",
            input: { message: toolInput.message },
            trigger_type: "chat",
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return { error: `Agent error: ${errText}` };
        }
        const result = await res.json();
        return {
          agent_name: result.agent_name,
          agent_slug: result.agent,
          response: result.response,
          proposals_created: result.proposals_created,
          tools_called: result.tools_called,
        };
      } catch (e: unknown) {
        return { error: `Agent delegation failed: ${(e as Error).message}` };
      }
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
7. Be direct and action-oriented. This is a power-user tool.
8. When the user asks for deep analysis (competitor analysis, content strategy, growth optimization, audience insights, revenue analysis), delegate to a specialized agent using delegate_to_agent. Present the agent's findings to the user.`;

  return { prompt, memoriesUsed: memories };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, message, workspace_id, model } = await req.json();
    if (!session_id || !message || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedModel = model || DEFAULT_MODEL;
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

    const openrouterMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Tool call loop
    let messages = openrouterMessages;
    let finalResponse = "";
    let toolCallsMade: string[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const apiRes = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "https://localhost",
          "X-Title": "AI Assistant",
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 4096,
          messages,
          tools: toolDefinitions,
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        console.error("OpenRouter API error:", errText);
        throw new Error(`OpenRouter API error: ${apiRes.status}`);
      }

      const data = await apiRes.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error("No response from model");

      const assistantMessage = choice.message;

      if (assistantMessage.content) {
        finalResponse = assistantMessage.content;
      }

      const toolCalls = assistantMessage.tool_calls;
      if (choice.finish_reason !== "tool_calls" || !toolCalls?.length) {
        break;
      }

      // Execute tool calls
      messages = [
        ...messages,
        assistantMessage,
      ];

      for (const tc of toolCalls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const result = await handleToolCall(
          tc.function.name,
          args,
          workspace_id,
          supabase
        );
        toolCallsMade.push(tc.function.name);
        messages.push({
          role: "tool",
          content: JSON.stringify(result),
        } as any);
      }
    }

    // Check if an agent was delegated to
    const agentDelegated = toolCallsMade.includes("delegate_to_agent");

    // Save assistant response
    await supabase.from("assistant_conversations").insert({
      workspace_id,
      session_id,
      role: "assistant",
      content: finalResponse,
      metadata: {
        memories_used: memoriesUsed.length,
        tools_called: toolCallsMade,
        model: selectedModel,
        agent_delegated: agentDelegated,
      },
    });

    return new Response(
      JSON.stringify({
        response: finalResponse,
        memories_used: memoriesUsed,
        tools_called: toolCallsMade,
        session_id,
        model: selectedModel,
        agent_delegated: agentDelegated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
