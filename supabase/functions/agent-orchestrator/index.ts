import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

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

// ── Data-query tool handlers ─────────────────────────────────

async function queryYoutubeStats(supabase: any, workspaceId: string, input: any) {
  const [channelRes, videosRes] = await Promise.all([
    supabase
      .from("youtube_channel_stats")
      .select("subscriber_count, video_count, total_view_count, fetched_at")
      .eq("workspace_id", workspaceId)
      .order("fetched_at", { ascending: false })
      .limit(5),
    supabase
      .from("youtube_video_stats")
      .select("title, views, likes, comments, ctr_percent, avg_view_duration_seconds, published_at")
      .eq("workspace_id", workspaceId)
      .order(input?.sort_by || "views", { ascending: false })
      .limit(input?.limit || 20),
  ]);
  return {
    channel_stats: channelRes.data ?? [],
    recent_videos: videosRes.data ?? [],
  };
}

async function queryCompetitors(supabase: any, workspaceId: string, _input: any) {
  const [channelsRes, historyRes] = await Promise.all([
    supabase
      .from("competitor_channels")
      .select("*")
      .eq("workspace_id", workspaceId),
    supabase
      .from("competitor_stats_history")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("recorded_at", { ascending: false })
      .limit(50),
  ]);
  return {
    competitors: channelsRes.data ?? [],
    stats_history: historyRes.data ?? [],
  };
}

async function queryContentPipeline(supabase: any, workspaceId: string, _input: any) {
  const [queueRes, suggestionsRes] = await Promise.all([
    supabase
      .from("video_queue")
      .select("id, title, status, priority, scheduled_date, platform, content_type")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("ai_content_suggestions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "suggestion")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  return {
    video_queue: queueRes.data ?? [],
    ai_suggestions: suggestionsRes.data ?? [],
  };
}

async function queryCrmData(supabase: any, workspaceId: string, _input: any) {
  const [contactsRes, dealsRes, companiesRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, status, last_contact_date, engagement_score")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .limit(50),
    supabase
      .from("deals")
      .select("id, title, value, stage, expected_close_date, contact_id, company_id, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("companies")
      .select("id, name, industry, status")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .limit(30),
  ]);
  return {
    contacts: contactsRes.data ?? [],
    deals: dealsRes.data ?? [],
    companies: companiesRes.data ?? [],
  };
}

async function queryRevenueData(supabase: any, workspaceId: string, _input: any) {
  const [dealsRes, affiliatesRes, transactionsRes, rateCardsRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, value, stage, expected_close_date, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("affiliate_programs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .limit(20),
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("workspace_id", workspaceId)
      .limit(5),
  ]);
  return {
    deals: dealsRes.data ?? [],
    affiliate_programs: affiliatesRes.data ?? [],
    recent_transactions: transactionsRes.data ?? [],
    rate_cards: rateCardsRes.data ?? [],
  };
}

async function queryComments(supabase: any, workspaceId: string, input: any) {
  const [commentsRes, leadCommentsRes] = await Promise.all([
    supabase
      .from("youtube_comments")
      .select("video_id, author_name, text, like_count, published_at")
      .eq("workspace_id", workspaceId)
      .order("published_at", { ascending: false })
      .limit(input?.limit || 100),
    supabase
      .from("youtube_lead_comments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("processed", false)
      .limit(30),
  ]);
  return {
    comments: commentsRes.data ?? [],
    lead_comments: leadCommentsRes.data ?? [],
  };
}

async function queryGrowthGoals(supabase: any, workspaceId: string) {
  const { data } = await supabase
    .from("growth_goals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .limit(5);
  return { growth_goals: data ?? [] };
}

async function queryAllVideoAnalytics(supabase: any, workspaceId: string, input: any) {
  const sortBy = input?.sort_by || "views";
  const [analyticsRes, statsRes] = await Promise.all([
    supabase
      .from("youtube_video_analytics")
      .select("video_id, title, views, estimated_minutes_watched, average_view_duration, impressions, impressions_click_through_rate, likes, comments")
      .eq("workspace_id", workspaceId)
      .order(sortBy === "ctr_percent" ? "impressions_click_through_rate" : sortBy === "watch_time_hours" ? "estimated_minutes_watched" : sortBy, { ascending: false })
      .limit(500),
    supabase
      .from("youtube_video_stats")
      .select("video_id, title, views, likes, comments, ctr_percent, avg_view_duration_seconds, published_at, thumbnail_url, description, tags")
      .eq("workspace_id", workspaceId)
      .order("views", { ascending: false })
      .limit(500),
  ]);

  const analytics = analyticsRes.data ?? [];
  const stats = statsRes.data ?? [];

  // Compute percentile rankings
  const viewCounts = stats.map((v: any) => v.views).sort((a: number, b: number) => a - b);
  const getPercentile = (views: number) => {
    const idx = viewCounts.findIndex((v: number) => v >= views);
    return idx >= 0 ? Math.round((idx / viewCounts.length) * 100) : 100;
  };

  const enrichedStats = stats.map((v: any) => ({
    ...v,
    percentile: getPercentile(v.views),
    quartile: getPercentile(v.views) <= 25 ? "bottom" : getPercentile(v.views) <= 50 ? "lower_mid" : getPercentile(v.views) <= 75 ? "upper_mid" : "top",
  }));

  return {
    video_analytics: analytics,
    video_stats: enrichedStats,
    total_videos: stats.length,
    avg_views: stats.length > 0 ? Math.round(viewCounts.reduce((a: number, b: number) => a + b, 0) / stats.length) : 0,
  };
}

async function queryExperiments(supabase: any, workspaceId: string, input: any) {
  let query = supabase
    .from("video_optimization_experiments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(input?.limit || 20);

  if (input?.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    experiments: data ?? [],
    active_count: (data ?? []).filter((e: any) => e.status === "active").length,
    completed_count: (data ?? []).filter((e: any) => e.status === "completed").length,
    rolled_back_count: (data ?? []).filter((e: any) => e.status === "rolled_back").length,
  };
}

async function createProposal(
  supabase: any,
  workspaceId: string,
  input: any
) {
  const VALID_ENTITY_TYPES = ["contact", "deal", "company", "video"];
  const VALID_PROPOSAL_TYPES = [
    "enrichment", "outreach", "deal_update", "score_update", "tag_suggestion",
    "video_title_optimization", "video_description_optimization",
    "video_tags_optimization", "video_thumbnail_optimization",
  ];

  const rawEntityType = input.entity_type || "company";
  const rawProposalType = input.proposal_type || "tag_suggestion";
  const isContentSuggestion = rawProposalType === "content_suggestion";
  const isVideoOptimization = rawProposalType.startsWith("video_");

  const dbEntityType = VALID_ENTITY_TYPES.includes(rawEntityType) ? rawEntityType : "company";
  const dbProposalType = VALID_PROPOSAL_TYPES.includes(rawProposalType) ? rawProposalType : "tag_suggestion";

  const proposedChanges = {
    ...(input.proposed_changes || {}),
    ...(isContentSuggestion ? { _actual_proposal_type: "content_suggestion" } : {}),
    ...(rawEntityType !== dbEntityType ? { _actual_entity_type: rawEntityType } : {}),
  };

  const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
  const entityId = (isContentSuggestion || isVideoOptimization)
    ? (input.entity_id || PLACEHOLDER_ID)
    : (input.entity_id || workspaceId);

  const insertData: Record<string, unknown> = {
    workspace_id: workspaceId,
    entity_type: isVideoOptimization ? "video" : dbEntityType,
    entity_id: entityId,
    proposal_type: isVideoOptimization ? rawProposalType : dbProposalType,
    title: input.title || "Agent Suggestion",
    summary: input.summary || null,
    proposed_changes: proposedChanges,
    confidence: input.confidence || 0.7,
    status: "pending",
  };

  // Video optimization fields
  if (isVideoOptimization) {
    if (input.video_id) insertData.video_id = input.video_id;
    if (input.optimization_proof) insertData.optimization_proof = input.optimization_proof;
    if (input.thumbnail_prompts) insertData.thumbnail_prompts = input.thumbnail_prompts;
    if (rawProposalType === "video_thumbnail_optimization") {
      insertData.requires_thumbnail_generation = true;
    }
  }

  const { data: inserted, error } = await supabase.from("ai_proposals").insert(insertData).select("id").single();

  if (error) return { success: false, error: error.message };
  return { success: true, title: input.title, proposal_id: inserted?.id };
}

async function saveInsight(
  supabase: any,
  workspaceId: string,
  input: any
) {
  try {
    const embedding = await getEmbedding(input.content);
    const { error } = await supabase.from("assistant_memory").insert({
      workspace_id: workspaceId,
      content: input.content,
      origin: "strategy",
      tags: input.tags || [],
      embedding: `[${embedding.join(",")}]`,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

async function memorySearch(
  supabase: any,
  workspaceId: string,
  input: any
) {
  try {
    const embedding = await getEmbedding(input.query);
    const { data, error } = await supabase.rpc("hybrid_memory_search", {
      query_embedding: `[${embedding.join(",")}]`,
      query_text: input.query,
      ws_id: workspaceId,
      origin_filter: input.origin_filter || "any",
      match_count: 5,
    });
    if (error) return { error: error.message };
    return { results: data || [] };
  } catch (e: any) {
    return { results: [], error: e.message };
  }
}

// ── Core tool definitions for all agents ─────────────────────

const coreToolDefinitions = [
  {
    type: "function",
    function: {
      name: "query_youtube_stats",
      description: "Fetch YouTube channel stats and recent video performance data from the database.",
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
        properties: {
          limit: { type: "integer", default: 100 },
        },
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
      description: "Create an actionable proposal for the user to review. Use for content ideas, outreach, deal updates, or video optimization recommendations. For video optimization, include video_id, optimization_proof, and thumbnail_prompts.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title (max 80 chars)" },
          summary: { type: "string", description: "1-2 sentence explanation" },
          entity_type: { type: "string", enum: ["contact", "deal", "company", "video_queue", "video"] },
          entity_id: { type: "string", description: "UUID or video ID of the relevant entity" },
          proposal_type: { type: "string", enum: ["enrichment", "outreach", "deal_update", "score_update", "tag_suggestion", "content_suggestion", "video_title_optimization", "video_description_optimization", "video_tags_optimization", "video_thumbnail_optimization"] },
          proposed_changes: { type: "object", description: "Specific suggested changes. For titles: {titles: [option1, option2, option3]}. For descriptions: {description: '...'}. For tags: {tags: [...]}. For thumbnails: {thumbnail_prompts: ['prompt1', ...]}" },
          confidence: { type: "number", description: "0.0-1.0 confidence score" },
          video_id: { type: "string", description: "YouTube video ID (for video optimization proposals)" },
          optimization_proof: { type: "object", description: "Data-driven evidence. Include: current_metrics, percentile, competitor_comparison, youtube_best_practices, expected_impact" },
          thumbnail_prompts: { type: "array", items: { type: "string" }, description: "Thumbnail generation prompts for Nano Banana 2 (for thumbnail optimization)" },
        },
        required: ["title", "summary", "proposal_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_all_video_analytics",
      description: "Fetch comprehensive analytics for ALL videos including 30-day views, CTR, impressions, watch time, and percentile rankings. Use this for video optimization analysis instead of query_youtube_stats when you need the full picture.",
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
      description: "Fetch past and active video optimization experiments to learn from previous results. Use this to understand what title/thumbnail/tag changes worked or didn't.",
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
      description: "Save a strategic insight or pattern to long-term memory for future reference.",
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
      description: "Search long-term memory for relevant past context, decisions, or observations.",
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

async function handleToolCall(
  toolName: string,
  toolInput: any,
  workspaceId: string,
  supabase: any
): Promise<any> {
  switch (toolName) {
    case "query_youtube_stats":
      return queryYoutubeStats(supabase, workspaceId, toolInput);
    case "query_competitors":
      return queryCompetitors(supabase, workspaceId, toolInput);
    case "query_content_pipeline":
      return queryContentPipeline(supabase, workspaceId, toolInput);
    case "query_crm_data":
      return queryCrmData(supabase, workspaceId, toolInput);
    case "query_revenue_data":
      return queryRevenueData(supabase, workspaceId, toolInput);
    case "query_comments":
      return queryComments(supabase, workspaceId, toolInput);
    case "query_growth_goals":
      return queryGrowthGoals(supabase, workspaceId);
    case "query_all_video_analytics":
      return queryAllVideoAnalytics(supabase, workspaceId, toolInput);
    case "query_experiments":
      return queryExperiments(supabase, workspaceId, toolInput);
    case "create_proposal":
      return createProposal(supabase, workspaceId, toolInput);
    case "save_insight":
      return saveInsight(supabase, workspaceId, toolInput);
    case "memory_search":
      return memorySearch(supabase, workspaceId, toolInput);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Auto-routing: classify which agent should handle a request ──

async function autoRouteAgent(
  openrouterKey: string,
  userInput: string
): Promise<string> {
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, agent_slug, skill_slug, input, trigger_type } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id" }),
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

    const supabase = getSupabaseAdmin();
    const startTime = Date.now();

    // Resolve agent slug (auto-route if needed)
    const resolvedSlug = agent_slug === "auto"
      ? await autoRouteAgent(openrouterKey, input?.message || input?.query || JSON.stringify(input))
      : agent_slug;

    // Load agent definition (system-level or workspace-level)
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
      return new Response(
        JSON.stringify({ error: `Agent not found: ${resolvedSlug}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create execution log entry
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
      // Build system prompt
      const userMessage = input?.message || input?.query || `Run ${skill_slug || "analysis"}`;
      const today = new Date().toISOString().split("T")[0];

      // Fetch relevant memories
      let memoryContext = "";
      try {
        const embedding = await getEmbedding(userMessage);
        const { data: memories } = await supabase.rpc("hybrid_memory_search", {
          query_embedding: `[${embedding.join(",")}]`,
          query_text: userMessage,
          ws_id: workspace_id,
          origin_filter: "any",
          match_count: 5,
        });
        if (memories?.length) {
          memoryContext = "\n\n=== RELEVANT MEMORIES ===\n" +
            memories.map((m: any) => `[${m.origin}] ${m.content}`).join("\n");
        }
      } catch {
        // Memory search is non-critical
      }

      // Fetch growth goal for context
      const { data: goalData } = await supabase
        .from("growth_goals")
        .select("target_value, current_value, target_date")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const goalContext = goalData
        ? `\nGrowth Goal: From ${goalData.current_value} to ${goalData.target_value} subscribers by ${goalData.target_date}.`
        : "";

      const systemPrompt = `${agentDef.system_prompt}

Today's date: ${today}${goalContext}${memoryContext}

IMPORTANT RULES:
1. Use the data query tools to fetch real data before making any analysis or recommendations.
2. Create proposals (via create_proposal) for every actionable recommendation you make.
3. Save important patterns or insights to memory (via save_insight) for future reference.
4. Be specific with numbers. Don't make up data — only reference what you fetch.
5. If asked to analyze and you find something noteworthy, always create a proposal.`;

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
            model: agentDef.model || DEFAULT_MODEL,
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
        if (assistantMessage.content) {
          finalResponse = assistantMessage.content;
        }

        const toolCalls = assistantMessage.tool_calls;
        if (choice.finish_reason !== "tool_calls" || !toolCalls?.length) {
          break;
        }

        messages.push(assistantMessage);

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

          if (tc.function.name === "create_proposal" && result.success) {
            proposalsCreated++;
          }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      }

      const durationMs = Date.now() - startTime;

      // Update execution log
      if (executionId) {
        await supabase
          .from("agent_executions")
          .update({
            status: "completed",
            output: {
              response: finalResponse,
              tools_called: toolCallsMade,
              proposals_created: proposalsCreated,
            },
            proposals_created: proposalsCreated,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          agent: resolvedSlug,
          agent_name: agentDef.name,
          response: finalResponse,
          tools_called: toolCallsMade,
          proposals_created: proposalsCreated,
          duration_ms: durationMs,
          execution_id: executionId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      // Update execution as failed
      if (executionId) {
        await supabase
          .from("agent_executions")
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
