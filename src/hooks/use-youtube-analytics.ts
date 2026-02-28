import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface YouTubeChannelStats {
  id: string;
  workspace_id: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  fetched_at: string;
}

export interface YouTubeVideoStats {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  watch_time_minutes: number;
  ctr_percent: number;
  published_at: string | null;
  fetched_at: string;
}

/** Fetches the most recent channel stats snapshots (ordered by fetched_at DESC). */
export function useYouTubeChannelStats(limit = 30) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-channel-stats", workspaceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as YouTubeChannelStats[];
    },
    enabled: !!workspaceId,
  });
}

/** Fetches the latest video stats for the workspace. */
export function useYouTubeVideoStats(limit = 20) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-video-stats", workspaceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as YouTubeVideoStats[];
    },
    enabled: !!workspaceId,
  });
}
