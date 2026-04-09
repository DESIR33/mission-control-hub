import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

import {
  queryYoutubeStats,
  queryCrmData,
  queryRevenueData,
  queryComments,
  queryGrowthGoals,
  queryContentPipeline as queryContentPipelineBase,
  queryAllVideoAnalytics as queryAllVideoAnalyticsBase,
  createProposal,
  getEmbedding,
  memorySearch,
  saveInsight,
} from "../_shared/data-queries.ts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "minimax/minimax-m2.5";

// ── Agent-orchestrator-specific query extensions ─────────────
// These extend the shared versions with extra data the orchestrator needs.

async function queryCompetitors(supabase: any, workspaceId: string) {
  const [channelsRes, historyRes] = await Promise.all([
    supabase.from("competitor_channels").select("id, channel_name, channel_id, subscriber_count, video_count, total_views")
      .eq("workspace_id", workspaceId),
    supabase.from("competitor_stats_history").select("channel_id, subscriber_count, video_count, total_views, recorded_at")
      .eq("workspace_id", workspaceId).order("recorded_at", { ascending: false }).limit(50),
  ]);
  return { competitors: channelsRes.data ?? [], stats_history: historyRes.data ?? [] };
}

async function queryContentPipeline(supabase: any, workspaceId: string) {
  const [baseResult, suggestionsRes] = await Promise.all([
    queryContentPipelineBase(supabase, workspaceId),
    supabase.from("ai_content_suggestions").select("id, title, topic, expected_views_low, expected_views_high, status")
      .eq("workspace_id", workspaceId).eq("status", "suggestion").order("created_at", { ascending: false }).limit(10),
  ]);
  return { ...baseResult, ai_suggestions: suggestionsRes.data ?? [] };
}

async function queryAllVideoAnalytics(supabase: any, workspaceId: string, input: any) {
  const sortBy = input?.sort_by || "views";
  const [analyticsRes, baseResult] = await Promise.all([
    supabase.from("youtube_video_analytics")
      .select("video_id, title, views, estimated_minutes_watched, average_view_duration, impressions, impressions_click_through_rate, likes, comments")
      .eq("workspace_id", workspaceId)
      .order(sortBy === "ctr_percent" ? "impressions_click_through_rate" : sortBy === "watch_time_hours" ? "estimated_minutes_watched" : sortBy, { ascending: false })
      .limit(500),
    queryAllVideoAnalyticsBase(supabase, workspaceId, input),
  ]);
  return { video_analytics: analyticsRes.data ?? [], ...baseResult };
}

async function queryExperiments(supabase: any, workspaceId: string, input: any) {
  let query = supabase.from("video_optimization_experiments").select("id, video_title, experiment_type, status, baseline_ctr, result_ctr, baseline_views, result_views, lesson_learned, created_at")
    .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(input?.limit || 20);
  if (input?.status && input.status !== "all") query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) return { error: error.message };

  const lessons = (data ?? [])
    .filter((e: any) => e.lesson_learned)
    .map((e: any) => ({
      video_title: e.video_title,
      experiment_type: e.experiment_type,
      lesson: e.lesson_learned,
      status: e.status,
      ctr_delta: e.result_ctr != null ? (e.result_ctr - e.baseline_ctr).toFixed(2) : null,
      views_delta: e.result_views != null && e.baseline_views > 0
        ? (((e.result_views - e.baseline_views) / e.baseline_views) * 100).toFixed(1) + "%"
        : null,
    }));

  return {
    experiments: data ?? [],
    active_count: (data ?? []).filter((e: any) => e.status === "active").length,
    completed_count: (data ?? []).filter((e: any) => e.status === "completed").length,
    lessons_learned: lessons,
    feedback_summary: lessons.length > 0
      ? `Based on ${lessons.length} past experiments: ${lessons.map((l: any) => l.lesson).join("; ")}`
      : "No experiment feedback available yet.",
  };
}

// ── Core tool definitions ────────────────────────────────────

const coreToolDefinitions = [
  {
    type: "function",
    function: {
      name: "query_youtube_stats",
      description: "Fetch YouTube channel stats and recent video performance data.",
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
      name: "query_competitors",
      description: "Fetch all tracked competitor channel data and recent stats history.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_content_pipeline",
      description: "Fetch the video queue (content pipeline) and AI content suggestions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_crm_data",
      description: "Fetch contacts, deals, and companies from the CRM.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_revenue_data",
      description: "Fetch deals, affiliate programs, transactions, and rate cards for revenue analysis.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_comments",
      description: "Fetch recent YouTube comments and unprocessed lead comments.",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer", default: 100 } },
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
      name: "create_proposal",
      description: "Create an actionable proposal for the user to review.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
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
  {
    type: "function",
    function: {
      name: "query_all_video_analytics",
      description: "Fetch comprehensive analytics for ALL videos with percentile rankings.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["views", "ctr_percent", "impressions", "watch_time_hours"], default: "views" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_experiments",
      description: "Fetch past and active video optimization experiments.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "completed", "rolled_back", "all"], default: "all" },
          limit: { type: "integer", default: 20 },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_insight",
      description: "Save a strategic insight or pattern to long-term memory. Be AGGRESSIVE — save every meaningful observation, correlation, or decision.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The insight to save" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_search",
      description: "Search long-term memory for relevant past context, decisions, or observations. Always check memory before making recommendations.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          origin_filter: { type: "string", enum: ["youtube", "crm", "email", "strategy", "preference", "manual", "any"], default: "any" },
        },
        required: ["query"],
      },
    },
  },
];

// ── Tool call handler ────────────────────────────────────────

async function handleToolCall(toolName: string, toolInput: any, workspaceId: string, supabase: any, agentSlug?: string): Promise<any> {
  switch (toolName) {
    case "query_youtube_stats": return queryYoutubeStats(supabase, workspaceId, toolInput);
    case "query_competitors": return queryCompetitors(supabase, workspaceId);
    case "query_content_pipeline": return queryContentPipeline(supabase, workspaceId);
    case "query_crm_data": return queryCrmData(supabase, workspaceId);
    case "query_revenue_data": return queryRevenueData(supabase, workspaceId);
    case "query_comments": return queryComments(supabase, workspaceId, toolInput);
    case "query_growth_goals": return queryGrowthGoals(supabase, workspaceId);
    case "query_all_video_analytics": return queryAllVideoAnalytics(supabase, workspaceId, toolInput);
    case "query_experiments": return queryExperiments(supabase, workspaceId, toolInput);
    case "create_proposal": return createProposal(supabase, workspaceId, toolInput);
    case "save_insight": return saveInsight(supabase, workspaceId, toolInput, agentSlug);
    case "memory_search": return memorySearch(supabase, workspaceId, toolInput, agentSlug);
    default: return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Auto-routing ─────────────────────────────────────────────

async function autoRouteAgent(openrouterKey: string, userInput: string): Promise<string> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-3",
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content: `Classify this request into exactly one agent slug. Options:
- competitor-analyst: competitor analysis, benchmarking, trending topics
- content-strategist: video ideas, titles, content planning, calendar
- growth-optimizer: subscriber growth, milestones, engagement optimization
- audience-analyst: comments, sentiment, audience demographics
- revenue-optimizer: sponsorships, deals, affiliates, monetization
Respond with ONLY the slug, nothing else.`,
        },
        { role: "user", content: userInput },
      ],
    }),
  });
  if (!res.ok) return "content-strategist";
  const data = await res.json();
  const slug = (data.choices?.[0]?.message?.content || "content-strategist").trim();
  const valid = ["competitor-analyst", "content-strategist", "growth-optimizer", "audience-analyst", "revenue-optimizer"];
  return valid.includes(slug) ? slug : "content-strategist";
}

// ── Main orchestrator ────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { workspace_id, agent_slug, skill_slug, input, trigger_type, model: requestModel } = await req.json();

    if (!workspace_id) {
      return jsonResponse({ error: "Missing workspace_id" }, 400);
    }

    // Auth: validate caller is a workspace member or service role
    const auth = await validateCallerOrServiceRole(req, workspace_id);
    if (!auth.authorized) return auth.response;

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return jsonResponse({ error: "OPENROUTER_API_KEY not configured" }, 500);
    }

    const supabase = getSupabaseAdmin();
    const startTime = Date.now();

    // Resolve agent slug
    const resolvedSlug = agent_slug === "auto"
      ? await autoRouteAgent(openrouterKey, input?.message || input?.query || JSON.stringify(input))
      : agent_slug;

    // Load agent definition
    const { data: agentDef } = await supabase
      .from("agent_definitions")
      .select("*")
      .eq("slug", resolvedSlug)
      .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`)
      .eq("enabled", true)
      .order("workspace_id", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!agentDef) {
      return jsonResponse({ error: `Agent not found: ${resolvedSlug}` }, 404);
    }

    // Create execution log
    const { data: execution } = await supabase
      .from("agent_executions")
      .insert({
        workspace_id,
        agent_id: agentDef.id,
        agent_slug: resolvedSlug,
        skill_slug: skill_slug || null,
        trigger_type: trigger_type || "manual",
        input: input || {},
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const executionId = execution?.id;

    try {
      const userMessage = input?.message || input?.query || `Run ${skill_slug || "analysis"}`;
      const today = new Date().toISOString().split("T")[0];

      // Load workspace identity + memories + growth goal in parallel
      const [identityRes, memoriesResult, goalRes] = await Promise.all([
        supabase.from("workspace_identity")
          .select("document_type, content")
          .eq("workspace_id", workspace_id),
        (async () => {
          try {
            const embedding = await getEmbedding(userMessage);
            const embeddingStr = embedding ? `[${embedding.join(",")}]` : "";
            const { data } = await supabase.rpc("hybrid_memory_search", {
              query_embedding: embeddingStr,
              query_text: userMessage,
              ws_id: workspace_id,
              origin_filter: "any",
              match_count: 5,
            });
            return data || [];
          } catch { return []; }
        })(),
        supabase.from("growth_goals").select("target_value, current_value, target_date")
          .eq("workspace_id", workspace_id).eq("status", "active").limit(1).maybeSingle(),
      ]);

      // Parse identity docs
      const identityDocs: Record<string, string> = {};
      for (const doc of (identityRes.data || []) as any[]) {
        identityDocs[doc.document_type] = doc.content;
      }

      const memories = memoriesResult as any[];
      const memoryContext = memories.length > 0
        ? "\n\n=== RELEVANT MEMORIES ===\n" + memories.map((m: any) => `[${m.origin}] ${m.content}`).join("\n")
        : "";

      const soulContext = identityDocs.soul ? `\n\n=== WORKSPACE IDENTITY ===\n${identityDocs.soul}` : "";
      const userProfileContext = identityDocs.user_profile ? `\n\n=== USER PROFILE ===\n${identityDocs.user_profile}` : "";
      const instructionsContext = identityDocs.agent_instructions ? `\n\n=== CUSTOM INSTRUCTIONS ===\n${identityDocs.agent_instructions}` : "";

      const goalData = goalRes.data;
      const goalContext = goalData
        ? `\nGrowth Goal: From ${goalData.current_value} to ${goalData.target_value} subscribers by ${goalData.target_date}.`
        : "";

      const systemPrompt = `${agentDef.system_prompt}

Today's date: ${today}${goalContext}${soulContext}${userProfileContext}${instructionsContext}${memoryContext}

## BEHAVIORAL RULES (OpenClaw Protocol)
1. **Query data first.** Use the data query tools to fetch real data before making any analysis or recommendations. Never make up data.
2. **Search memory.** Before analyzing, check memory_search for relevant past context, decisions, and patterns.
3. **Save aggressively.** After every significant analysis, call save_insight with your key findings and patterns. This is your legacy — future runs depend on it.
4. **Create proposals.** For every actionable recommendation, create a proposal via create_proposal so it enters the user's review queue.
5. **Be specific with numbers.** Percentages, counts, comparisons. No vague statements.
6. **Have opinions.** Give decisive, ranked recommendations. Don't hedge — commit to a position backed by data.
7. **Connect the dots.** Relate findings across data sources. YouTube performance ↔ CRM activity ↔ revenue ↔ content pipeline.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      // Tool-call loop
      let finalResponse = "";
      let toolCallsMade: string[] = [];
      let proposalsCreated = 0;
      let iterations = 0;
      const MAX_ITERATIONS = 15;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const apiRes = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "https://localhost",
            "X-Title": `Agent: ${agentDef.name}`,
          },
          body: JSON.stringify({
            model: requestModel || agentDef.model || DEFAULT_MODEL,
            max_tokens: 4096,
            messages,
            tools: coreToolDefinitions,
          }),
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          throw new Error(`OpenRouter API error: ${apiRes.status} - ${errText}`);
        }

        const data = await apiRes.json();
        const choice = data.choices?.[0];
        if (!choice) throw new Error("No response from model");

        const assistantMessage = choice.message;
        if (assistantMessage.content) finalResponse = assistantMessage.content;

        const toolCalls = assistantMessage.tool_calls;
        if (choice.finish_reason !== "tool_calls" || !toolCalls?.length) break;

        messages.push(assistantMessage);

        for (const tc of toolCalls) {
          const args = typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          const result = await handleToolCall(tc.function.name, args, workspace_id, supabase, resolvedSlug);
          toolCallsMade.push(tc.function.name);
          if (tc.function.name === "create_proposal" && result.success) proposalsCreated++;
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
      }

      // Post-run: auto-save a summary insight
      if (finalResponse && finalResponse.length > 100) {
        try {
          const summaryContent = `[${agentDef.name}] Ran analysis: ${userMessage.slice(0, 100)}. Key findings: ${finalResponse.slice(0, 500)}`;
          await saveInsight(supabase, workspace_id, {
            content: summaryContent,
            tags: [resolvedSlug, "auto-summary", today],
          }, resolvedSlug);
        } catch { /* non-critical */ }
      }

      const durationMs = Date.now() - startTime;

      // Update execution log
      if (executionId) {
        await supabase.from("agent_executions")
          .update({
            status: "completed",
            output: { response: finalResponse, tools_called: toolCallsMade, proposals_created: proposalsCreated },
            proposals_created: proposalsCreated,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      return jsonResponse({
        success: true,
        agent: resolvedSlug,
        agent_name: agentDef.name,
        response: finalResponse,
        tools_called: toolCallsMade,
        proposals_created: proposalsCreated,
        duration_ms: durationMs,
        execution_id: executionId,
      });
    } catch (err: any) {
      if (executionId) {
        await supabase.from("agent_executions")
          .update({
            status: "failed",
            error_message: err.message,
            duration_ms: Date.now() - startTime,
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Agent orchestrator error:", error);
    return errorResponse(error, 500);
  }
});
