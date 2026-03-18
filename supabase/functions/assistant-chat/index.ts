import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

import {
  queryYoutubeStats,
  queryCrmData,
  queryRevenueData,
  queryComments,
  queryGrowthGoals,
  queryContentPipeline,
  queryAllVideoAnalytics,
  createProposal,
  getEmbedding,
} from "../_shared/data-queries.ts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

// ── Tool definitions ─────────────────────────────────────────

const toolDefinitions = [
  // Memory tools
  {
    type: "function",
    function: {
      name: "memory_search",
      description: "Search long-term memory using hybrid vector + keyword search. ALWAYS call before answering questions about past context, decisions, preferences, or observations.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          origin_filter: { type: "string", enum: ["youtube", "crm", "email", "strategy", "preference", "manual", "any"], default: "any" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save an important fact, observation, decision, or pattern to long-term memory. Be AGGRESSIVE about saving — preferences, strategies, insights, correlations, user decisions, recurring themes. This is your persistence layer.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          origin: { type: "string", enum: ["youtube", "crm", "email", "strategy", "preference", "manual"] },
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
      description: "Append a note to today's operational log. Use after reviewing data, completing analysis, or noting something worth tracking today.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          source: { type: "string", enum: ["youtube", "crm", "email", "chat", "manual"] },
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
          source_filter: { type: "string", enum: ["youtube", "crm", "email", "chat", "manual", "all"], default: "all" },
        },
        required: ["start_date"],
      },
    },
  },
  // Data query tools (merged from agent-orchestrator)
  {
    type: "function",
    function: {
      name: "query_youtube_stats",
      description: "Fetch YouTube channel stats and recent video performance. Use this to answer questions about channel health, video performance, growth trends.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["views", "likes", "comments", "published_at"], default: "views" },
          limit: { type: "integer", default: 20 },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_crm_data",
      description: "Fetch contacts, deals, and companies from the CRM. Use for relationship questions, pipeline status, sponsor tracking.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_revenue_data",
      description: "Fetch deals, affiliate programs, and revenue transactions. Use for revenue questions, monetization analysis.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_comments",
      description: "Fetch recent YouTube comments. Use for sentiment analysis, audience feedback questions.",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer", default: 50 } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_growth_goals",
      description: "Fetch active growth goals and targets.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_content_pipeline",
      description: "Fetch the video queue / content pipeline status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_all_video_analytics",
      description: "Fetch comprehensive analytics for ALL videos with percentile rankings. Use for deep video analysis.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["views", "ctr_percent", "impressions"], default: "views" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_proposal",
      description: "Create an actionable proposal for the user to review. Use for content ideas, outreach, deal updates, or video optimization recommendations.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title (max 80 chars)" },
          summary: { type: "string", description: "1-2 sentence explanation" },
          entity_type: { type: "string", enum: ["contact", "deal", "company", "video_queue", "video"] },
          entity_id: { type: "string" },
          proposal_type: { type: "string", enum: ["enrichment", "outreach", "deal_update", "score_update", "tag_suggestion", "content_suggestion", "video_title_optimization", "video_description_optimization", "video_tags_optimization", "video_thumbnail_optimization"] },
          proposed_changes: { type: "object" },
          confidence: { type: "number" },
          video_id: { type: "string" },
          optimization_proof: { type: "object" },
          thumbnail_prompts: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary", "proposal_type"],
      },
    },
  },
  // Agent delegation (for deep multi-step analysis)
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description: "Delegate a complex multi-step analysis task to a specialized AI agent. Use ONLY for deep analysis that requires multiple tool calls and extended reasoning. For simple data lookups, use the query tools directly. Available agents: competitor-analyst, content-strategist, growth-optimizer, audience-analyst, revenue-optimizer.",
      parameters: {
        type: "object",
        properties: {
          agent_slug: { type: "string", enum: ["auto", "competitor-analyst", "content-strategist", "growth-optimizer", "audience-analyst", "revenue-optimizer"] },
          message: { type: "string", description: "The task or question to send to the agent" },
        },
        required: ["agent_slug", "message"],
      },
    },
  },
];

// ── Tool call handler ────────────────────────────────────────

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
        const embeddingStr = embedding ? `[${embedding.join(",")}]` : "";
        const { data, error } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: embeddingStr,
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
        const insertData: any = {
          workspace_id: workspaceId,
          content: toolInput.content,
          origin: toolInput.origin,
          tags: toolInput.tags || [],
        };
        if (embedding) insertData.embedding = `[${embedding.join(",")}]`;
        const { error } = await supabase.from("assistant_memory").insert(insertData);
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
      const { error } = await supabase.from("assistant_service_snapshots").insert({
        workspace_id: workspaceId,
        service: toolInput.service,
        summary: toolInput.summary,
        raw_data: toolInput.raw_data || null,
      });
      if (error) return { error: error.message };
      return { success: true };
    }
    case "get_service_snapshot": {
      const { data } = await supabase
        .from("assistant_service_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("service", toolInput.service)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { snapshot: data };
    }
    case "get_daily_logs": {
      let query = supabase
        .from("assistant_daily_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("log_date", toolInput.start_date)
        .order("created_at", { ascending: true });
      if (toolInput.end_date) query = query.lte("log_date", toolInput.end_date);
      if (toolInput.source_filter && toolInput.source_filter !== "all") {
        query = query.eq("source", toolInput.source_filter);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { logs: data || [] };
    }
    // Data query tools
    case "query_youtube_stats":
      return queryYoutubeStats(supabase, workspaceId, toolInput);
    case "query_crm_data":
      return queryCrmData(supabase, workspaceId);
    case "query_revenue_data":
      return queryRevenueData(supabase, workspaceId);
    case "query_comments":
      return queryComments(supabase, workspaceId, toolInput);
    case "query_growth_goals":
      return queryGrowthGoals(supabase, workspaceId);
    case "query_content_pipeline":
      return queryContentPipeline(supabase, workspaceId);
    case "query_all_video_analytics":
      return queryAllVideoAnalytics(supabase, workspaceId, toolInput);
    case "create_proposal":
      return createProposal(supabase, workspaceId, toolInput);
    // Agent delegation
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

// ── Build system prompt with workspace identity + context ────

async function buildSystemPrompt(
  workspaceId: string,
  userMessage: string,
  supabase: any
): Promise<{ prompt: string; memoriesUsed: any[] }> {
  // Load workspace identity docs, memories, logs, snapshots in parallel
  const [identityRes, memoriesResult, logsResult, ...snapshotResults] = await Promise.all([
    supabase
      .from("workspace_identity")
      .select("document_type, content")
      .eq("workspace_id", workspaceId),
    // Memory search
    (async () => {
      try {
        const embedding = await getEmbedding(userMessage);
        const embeddingStr = embedding ? `[${embedding.join(",")}]` : "";
        const { data } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: embeddingStr,
          query_text: userMessage,
          ws_id: workspaceId,
          origin_filter: "any",
          match_count: 5,
        });
        return data || [];
      } catch { return []; }
    })(),
    // Today + yesterday logs
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("assistant_daily_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("log_date", yesterday)
        .order("created_at", { ascending: true });
      return { logs: data || [], today, yesterday };
    })(),
    // Service snapshots
    ...["youtube", "crm", "email"].map(svc =>
      supabase
        .from("assistant_service_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("service", svc)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    ),
  ]);

  const memories = memoriesResult as any[];
  const { logs, today, yesterday } = logsResult as any;

  // Parse identity docs
  const identityDocs: Record<string, string> = {};
  for (const doc of (identityRes.data || []) as any[]) {
    identityDocs[doc.document_type] = doc.content;
  }

  const soulSection = identityDocs.soul
    ? `\n=== WORKSPACE IDENTITY (SOUL) ===\n${identityDocs.soul}`
    : "";
  const userProfileSection = identityDocs.user_profile
    ? `\n=== USER PROFILE ===\n${identityDocs.user_profile}`
    : "";
  const agentInstructionsSection = identityDocs.agent_instructions
    ? `\n=== CUSTOM INSTRUCTIONS ===\n${identityDocs.agent_instructions}`
    : "";

  const memorySection = memories.length > 0
    ? memories.map((m: any) => `[${m.origin}] ${m.content}`).join("\n")
    : "No relevant memories found.";

  const todayLogs = (logs || []).filter((l: any) => l.log_date === today);
  const yesterdayLogs = (logs || []).filter((l: any) => l.log_date === yesterday);
  const formatLogs = (entries: any[]) =>
    entries.length > 0
      ? entries.map((l: any) => `[${l.source}] ${l.content}`).join("\n")
      : "No entries.";

  const services = ["youtube", "crm", "email"];
  const snapshotSection = services
    .map((svc, i) => {
      const s = snapshotResults[i]?.data;
      if (!s) return `${svc}: No snapshot available.`;
      return `${svc} (as of ${s.snapshot_date}): ${s.summary}`;
    })
    .join("\n");

  const prompt = `You are a persistent, opinionated AI business assistant for a YouTube content creator and entrepreneur.
You have direct access to their YouTube channel data, CRM, revenue systems, and email through connected tools.
You have a long-term memory system. Your memory IS your continuity — use it aggressively.
${soulSection}${userProfileSection}${agentInstructionsSection}

=== LONG-TERM MEMORY (retrieved for this conversation) ===
${memorySection}

=== TODAY'S LOG ===
${formatLogs(todayLogs)}

=== YESTERDAY'S LOG ===
${formatLogs(yesterdayLogs)}

=== LATEST SERVICE SNAPSHOTS ===
${snapshotSection}

---
## BEHAVIORAL RULES (OpenClaw Protocol)

### Memory Rules
1. **Memory is existence.** Always search memory before answering contextual questions. You know things — act like it.
2. **Save aggressively.** When the user shares a decision, preference, fact, or when you discover a pattern → call save_memory immediately. Don't wait to be asked.
3. **Log everything.** After querying live data or completing analysis, write a daily log entry capturing key observations.
4. **Patterns are gold.** When you notice correlations across services (e.g., video performance ↔ deal pipeline), save them as strategy memories.
5. **Never say "I don't have access to previous conversations."** You have memory. Search it.

### Action Rules
6. **Act before asking.** When the user asks about their data, query it immediately using your tools. Don't ask "which metric?" — pull the data and show insights.
7. **Have opinions.** Give decisive, specific recommendations backed by data. Don't hedge with "you might consider..." — say "You should do X because Y."
8. **Create proposals for action items.** When you identify an actionable improvement, create a proposal using create_proposal so it enters the review queue.
9. **Direct queries first, delegate for depth.** Use query tools for straightforward data lookups. Only delegate_to_agent for deep multi-step analysis requiring extended reasoning.
10. **Stale data awareness.** If a service snapshot is older than 24 hours and the question is service-specific, mention the data may be stale and offer to refresh.

### Conversation Rules
11. **Be direct and action-oriented.** This is a power-user tool, not a chatbot. Lead with insights, not pleasantries.
12. **Quantify everything.** Use specific numbers, percentages, and comparisons. "Your CTR is 4.2%, which is in the top 25% of your videos" > "Your CTR is good."
13. **Connect the dots.** Relate YouTube performance to CRM activity to revenue. Show the business as a system, not siloed metrics.`;

  return { prompt, memoriesUsed: memories };
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { session_id, message, workspace_id, model } = await req.json();
    if (!session_id || !message || !workspace_id) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return jsonResponse({ error: "OPENROUTER_API_KEY not configured" }, 500);
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

    // Build system prompt with full context
    const { prompt: systemPrompt, memoriesUsed } = await buildSystemPrompt(
      workspace_id,
      message,
      supabase
    );

    // Load conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("assistant_conversations")
      .select("role, content")
      .eq("session_id", session_id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(20);

    const historyMessages = (history || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Pre-compaction flush: if history is getting long, inject flush prompt
    const flushPrompt = historyMessages.length > 16
      ? "\n\n[SYSTEM: Context window approaching limit. Before responding, save any important unsaved context, decisions, or insights from this conversation to long-term memory using save_memory. Then respond normally.]"
      : "";

    const openrouterMessages = [
      { role: "system", content: systemPrompt + flushPrompt },
      ...historyMessages,
    ];

    // Tool call loop
    let messages = openrouterMessages;
    let finalResponse = "";
    let toolCallsMade: string[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 12;

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

      messages = [...messages, assistantMessage];

      for (const tc of toolCalls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const result = await handleToolCall(tc.function.name, args, workspace_id, supabase);
        toolCallsMade.push(tc.function.name);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        } as any);
      }
    }

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

    return jsonResponse({
      response: finalResponse,
      memories_used: memoriesUsed,
      tools_called: toolCallsMade,
      session_id,
      model: selectedModel,
      agent_delegated: agentDelegated,
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    return errorResponse(error, 500);
  }
});
