import { supabase } from "@/integrations/supabase/client";

/**
 * When a sponsorship deal is created/updated with linked videos,
 * ensure each linked video has a corresponding video_queue (content pipeline) entry.
 */
export async function syncDealToPipeline(params: {
  dealId: string;
  workspaceId: string;
  companyId: string | null;
  companyName: string;
  dealTitle: string;
  linkedVideoIds: string[];
}) {
  const { dealId, workspaceId, companyId, companyName, dealTitle, linkedVideoIds } = params;
  if (!linkedVideoIds.length) return;

  // Check which videos already have pipeline entries linked to this deal
  const { data: existing } = await supabase
    .from("video_queue")
    .select("id, youtube_video_id, metadata")
    .eq("workspace_id", workspaceId)
    .eq("deal_id", dealId);

  const existingYtIds = new Set((existing ?? []).map((e: any) => e.youtube_video_id).filter(Boolean));

  // Only create pipeline items for videos not already linked
  const newVideoIds = linkedVideoIds.filter((vid) => !existingYtIds.has(vid));
  if (!newVideoIds.length) return;

  // Try to get titles from youtube_video_stats
  const { data: stats } = await supabase
    .from("youtube_video_stats" as any)
    .select("youtube_video_id, title")
    .eq("workspace_id", workspaceId)
    .in("youtube_video_id", newVideoIds);
  const titleMap = new Map((stats ?? []).map((s: any) => [s.youtube_video_id, s.title]));

  const rows = newVideoIds.map((vid) => ({
    workspace_id: workspaceId,
    title: titleMap.get(vid) || `Sponsored: ${dealTitle}`,
    description: `Auto-created from sponsorship deal: ${dealTitle}`,
    status: "idea",
    priority: "medium",
    deal_id: dealId,
    youtube_video_id: vid,
    metadata: {
      isSponsored: true,
      sponsoringCompany: companyId
        ? { id: companyId, name: companyName, logo: null }
        : null,
      sponsoringCompanyId: companyId,
    },
  }));

  await supabase.from("video_queue").insert(rows as any);
}

/**
 * When a content pipeline item is saved as sponsored with a company,
 * ensure a sponsorship deal exists and is linked.
 */
export async function syncPipelineToDeal(params: {
  videoQueueId: string;
  workspaceId: string;
  title: string;
  companyId: string;
  companyName: string;
  youtubeVideoId: string | null;
  existingDealId: string | null;
}): Promise<string | null> {
  const { videoQueueId, workspaceId, title, companyId, companyName, youtubeVideoId, existingDealId } = params;

  // If already linked to a deal, just update metadata
  if (existingDealId) {
    // Also sync youtube_video_id to deal_videos if present
    if (youtubeVideoId) {
      const { data: existingLink } = await supabase
        .from("deal_videos" as any)
        .select("id")
        .eq("deal_id", existingDealId)
        .eq("youtube_video_id", youtubeVideoId)
        .maybeSingle();

      if (!existingLink) {
        await supabase.from("deal_videos" as any).insert({
          deal_id: existingDealId,
          youtube_video_id: youtubeVideoId,
          workspace_id: workspaceId,
        } as any);
      }
    }
    return existingDealId;
  }

  // Create a new sponsorship deal
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      workspace_id: workspaceId,
      title: `Sponsorship - ${companyName}`,
      company_id: companyId,
      stage: "prospecting",
      notes: `Auto-created from content pipeline: ${title}`,
    })
    .select("id")
    .single();

  if (error || !deal) return null;

  // Link the video to the deal
  if (youtubeVideoId) {
    await supabase.from("deal_videos" as any).insert({
      deal_id: deal.id,
      youtube_video_id: youtubeVideoId,
      workspace_id: workspaceId,
    } as any);
  }

  // Link the pipeline item to the deal
  await supabase
    .from("video_queue")
    .update({ deal_id: deal.id } as any)
    .eq("id", videoQueueId);

  return deal.id;
}
