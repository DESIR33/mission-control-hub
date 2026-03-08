import { useMemo } from "react";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";

export interface VideoComparisonData {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  ctr_percent: number;
  avg_view_duration_seconds: number | null;
  watch_time_minutes: number;
  published_at: string | null;
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
      avg_view_duration_seconds: v.avg_view_duration_seconds,
      watch_time_minutes: v.watch_time_minutes,
      published_at: v.published_at,
    }));
  }, [videos]);

  return { data: comparisonData, isLoading };
}
