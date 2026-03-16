/**
 * Shared data query functions used by both agent-orchestrator and assistant-chat.
 * Centralizes database query logic to avoid duplication across edge functions.
 */

export async function queryYoutubeStats(supabase: any, workspaceId: string, input: any) {
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
  return { channel_stats: channelRes.data ?? [], recent_videos: videosRes.data ?? [] };
}

export async function queryCrmData(supabase: any, workspaceId: string) {
  const [contactsRes, dealsRes, companiesRes] = await Promise.all([
    supabase.from("contacts").select("id, first_name, last_name, email, status, last_contact_date")
      .eq("workspace_id", workspaceId).is("deleted_at", null).limit(50),
    supabase.from("deals").select("id, title, value, stage, expected_close_date, contact_id, company_id, updated_at")
      .eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase.from("companies").select("id, name, industry, website")
      .eq("workspace_id", workspaceId).is("deleted_at", null).limit(30),
  ]);
  return { contacts: contactsRes.data ?? [], deals: dealsRes.data ?? [], companies: companiesRes.data ?? [] };
}

export async function queryRevenueData(supabase: any, workspaceId: string) {
  const [dealsRes, affiliatesRes, transactionsRes] = await Promise.all([
    supabase.from("deals").select("id, title, value, stage, expected_close_date")
      .eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase.from("affiliate_programs").select("id, name, platform, commission_rate, status")
      .eq("workspace_id", workspaceId).limit(20),
    supabase.from("revenue_transactions").select("amount, type, status, source, product_name, created_at")
      .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
  ]);
  return { deals: dealsRes.data ?? [], affiliate_programs: affiliatesRes.data ?? [], transactions: transactionsRes.data ?? [] };
}

export async function queryComments(supabase: any, workspaceId: string, input: any) {
  const { data } = await supabase
    .from("youtube_comments")
    .select("video_id, author_name, text, like_count, published_at")
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false })
    .limit(input?.limit || 50);
  return { comments: data ?? [] };
}

export async function queryGrowthGoals(supabase: any, workspaceId: string) {
  const { data } = await supabase.from("growth_goals").select("id, title, metric, target_value, current_value, target_date, status")
    .eq("workspace_id", workspaceId).eq("status", "active").limit(5);
  return { growth_goals: data ?? [] };
}

export async function queryContentPipeline(supabase: any, workspaceId: string) {
  const { data } = await supabase.from("video_queue")
    .select("id, title, status, priority, scheduled_date, platform, content_type")
    .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30);
  return { video_queue: data ?? [] };
}

export async function queryAllVideoAnalytics(supabase: any, workspaceId: string, input: any) {
  const { data: stats } = await supabase
    .from("youtube_video_stats")
    .select("video_id, title, views, likes, comments, ctr_percent, avg_view_duration_seconds, published_at, thumbnail_url")
    .eq("workspace_id", workspaceId)
    .order("views", { ascending: false })
    .limit(500);

  const videos = stats ?? [];
  const viewCounts = videos.map((v: any) => v.views).sort((a: number, b: number) => a - b);
  const getPercentile = (views: number) => {
    const idx = viewCounts.findIndex((v: number) => v >= views);
    return idx >= 0 ? Math.round((idx / viewCounts.length) * 100) : 100;
  };

  return {
    video_stats: videos.map((v: any) => ({ ...v, percentile: getPercentile(v.views) })),
    total_videos: videos.length,
    avg_views: videos.length > 0 ? Math.round(viewCounts.reduce((a: number, b: number) => a + b, 0) / videos.length) : 0,
  };
}

export async function createProposal(supabase: any, workspaceId: string, input: any) {
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
  };
  const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
  const entityId = (isContentSuggestion || isVideoOptimization) ? (input.entity_id || PLACEHOLDER_ID) : (input.entity_id || workspaceId);

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
  if (isVideoOptimization) {
    if (input.video_id) insertData.video_id = input.video_id;
    if (input.optimization_proof) insertData.optimization_proof = input.optimization_proof;
    if (input.thumbnail_prompts) insertData.thumbnail_prompts = input.thumbnail_prompts;
    if (rawProposalType === "video_thumbnail_optimization") insertData.requires_thumbnail_generation = true;
  }

  const { data: inserted, error } = await supabase.from("ai_proposals").insert(insertData).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, title: input.title, proposal_id: inserted?.id };
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data[0].embedding;
  } catch { return null; }
}

export async function memorySearch(supabase: any, workspaceId: string, input: any) {
  try {
    const embedding = await getEmbedding(input.query);
    const embeddingStr = embedding ? `[${embedding.join(",")}]` : "";
    const { data, error } = await supabase.rpc("hybrid_memory_search", {
      query_embedding: embeddingStr,
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

export async function saveInsight(supabase: any, workspaceId: string, input: any) {
  try {
    const embedding = await getEmbedding(input.content);
    const insertData: any = {
      workspace_id: workspaceId,
      content: input.content,
      origin: "strategy",
      tags: input.tags || [],
    };
    if (embedding) insertData.embedding = `[${embedding.join(",")}]`;
    const { error } = await supabase.from("assistant_memory").insert(insertData);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
