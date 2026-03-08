import { useMemo } from "react";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";

export interface VideoComparisonData {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  ctr_percent: number;
  avg_view_percent: number;
  estimated_revenue: number;
  subscribers_gained: number;
  published_at: string | null;
  thumbnail_url: string | null;
}

export function useVideoComparison() {
  const { data: videos = [], isLoading } = useYouTubeVideoStats(200);

  const comparisonData = useMemo((): VideoComparisonData[] => {
    return videos.map((v) => ({
      id: v.youtube_video_id,
      title: v.title,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      ctr_percent: v.ctr_percent,
      avg_view_percent: v.average_view_percentage,
      estimated_revenue: v.estimated_revenue,
      subscribers_gained: v.subscribers_gained,
      published_at: v.published_at,
      thumbnail_url: v.thumbnail_url ?? null,
    }));
  }, [videos]);

  return { data: comparisonData, isLoading };
}
