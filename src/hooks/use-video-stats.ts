import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoStats {
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  views: number;
  likes: number;
  comments: number;
  ctr_percent: number;
  tags: string[] | null;
  watch_time_minutes: number;
  avg_view_duration_seconds: number | null;
}

export function useVideoStats(youtubeVideoId: string | null | undefined) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoStats | null>({
    queryKey: ["youtube_video_stats", workspaceId, youtubeVideoId],
    queryFn: async () => {
      if (!youtubeVideoId || !workspaceId) return null;
      const { data, error } = await supabase
        .from("youtube_video_stats")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VideoStats | null;
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
