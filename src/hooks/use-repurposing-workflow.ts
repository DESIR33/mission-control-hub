import { useMemo } from "react";
import { useRepurposes, useCreateRepurpose, type ContentRepurpose } from "@/hooks/use-repurposes";
import { useVideoQueue } from "@/hooks/use-video-queue";

const REPURPOSE_TEMPLATES = [
  { platform: "YouTube", format: "Short", title: "YouTube Short - Key Clip" },
  { platform: "Twitter/X", format: "Thread", title: "Twitter/X Thread (5-tweet summary)" },
  { platform: "Newsletter", format: "Block", title: "Newsletter Feature Block" },
  { platform: "LinkedIn", format: "Post", title: "LinkedIn Post" },
  { platform: "YouTube", format: "Community Post", title: "Community Post" },
];

export { REPURPOSE_TEMPLATES };

export type RepurposeStatus = "draft" | "scheduled" | "published" | "tracked" | "planned" | "in_progress" | "archived";

export const REPURPOSE_STATUSES: RepurposeStatus[] = [
  "draft",
  "scheduled",
  "published",
  "tracked",
  "archived",
];

export const REPURPOSE_PLATFORMS = [
  { id: "youtube_shorts", label: "YouTube Shorts", format: "Short-form vertical" },
  { id: "tiktok", label: "TikTok", format: "Short-form vertical" },
  { id: "ig_reels", label: "IG Reels", format: "Short-form vertical" },
  { id: "ig_carousel", label: "IG Carousel", format: "Multi-image carousel" },
  { id: "twitter_thread", label: "Twitter/X Thread", format: "Text thread" },
  { id: "linkedin_post", label: "LinkedIn Post", format: "Long-form text" },
];

export function useRepurposingWorkflow() {
  const { data: videos } = useVideoQueue();
  const { data: allRepurposes } = useRepurposes();

  const videoRepurposeMap = useMemo(() => {
    const map = new Map<
      number,
      { repurposes: ContentRepurpose[]; completionPercent: number }
    >();
    if (!videos || !allRepurposes) return map;

    for (const video of videos) {
      const videoId = Number(video.id);
      const repurposes = allRepurposes.filter(
        (r) => Number(r.source_video_id) === videoId
      );
      const completedCount = repurposes.filter(
        (r) => r.status === "published"
      ).length;
      const total = repurposes.length || REPURPOSE_TEMPLATES.length;
      const completionPercent =
        repurposes.length > 0 ? Math.round((completedCount / total) * 100) : 0;
      map.set(videoId, { repurposes, completionPercent });
    }

    return map;
  }, [videos, allRepurposes]);

  const completionStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let planned = 0;

    videoRepurposeMap.forEach(({ repurposes }) => {
      for (const r of repurposes) {
        total++;
        if (r.status === "published") completed++;
        else if (r.status === "in_progress") inProgress++;
        else planned++;
      }
    });

    return { total, completed, inProgress, planned };
  }, [videoRepurposeMap]);

  const overallCompletionRate = useMemo(() => {
    if (completionStats.total === 0) return 0;
    return Math.round(
      (completionStats.completed / completionStats.total) * 100
    );
  }, [completionStats]);

  return { videoRepurposeMap, completionStats, overallCompletionRate };
}

export function useAutoGenerateRepurposes() {
  const { data: allRepurposes } = useRepurposes();
  const createRepurpose = useCreateRepurpose();

  const generate = async (sourceVideoId: number | string) => {
    const videoId = Number(sourceVideoId);
    const existing = (allRepurposes ?? []).filter(
      (r) => Number(r.source_video_id) === videoId
    );

    const toCreate = REPURPOSE_TEMPLATES.filter(
      (template) =>
        !existing.some(
          (r) =>
            r.platform === template.platform && r.format === template.format
        )
    );

    for (const template of toCreate) {
      await createRepurpose.mutateAsync({
        sourceVideoId: videoId,
        platform: template.platform,
        format: template.format,
        title: template.title,
        status: "planned",
      });
    }
  };

  return {
    generate,
    isPending: createRepurpose.isPending,
  };
}

export function useRepurposeCompletionForVideo(
  sourceVideoId: number | string
) {
  const { data: repurposes } = useRepurposes(sourceVideoId);

  return useMemo(() => {
    const items = repurposes ?? [];
    const totalItems = items.length;
    const completedItems = items.filter(
      (r) => r.status === "published"
    ).length;
    const completionPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return { repurposes: items, completionPercent, totalItems, completedItems };
  }, [repurposes]);
}
