import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";

export interface YouTubeChannelStats {
  id: string;
  workspace_id: string;
  subscriber_count: number;
  video_count: number;
  total_view_count: number;
  fetched_at: string;
  created_at: string;
}

export interface GrowthGoal {
  id: string;
  workspace_id: string;
  title: string;
  metric: string;
  target_value: number;
  current_value: number;
  start_date: string | null;
  target_date: string | null;
  status: "active" | "achieved" | "paused";
  created_at: string;
  updated_at: string;
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
  avg_view_duration_seconds: number | null;
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
        .from("youtube_channel_stats" as any)
        .select("id,workspace_id,subscriber_count,video_count,total_view_count,fetched_at,created_at")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeChannelStats[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Alias — returns the single latest snapshot or null. */
export function useChannelStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube_channel_stats", workspaceId],
    queryFn: async (): Promise<YouTubeChannelStats | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("id,workspace_id,subscriber_count,video_count,total_view_count,fetched_at,created_at")
        .eq("workspace_id", workspaceId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("youtube_channel_stats query failed:", error.message);
        return null;
      }

      return data as unknown as YouTubeChannelStats | null;
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useGrowthGoal() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["growth_goals", workspaceId],
    queryFn: async (): Promise<GrowthGoal | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("id,workspace_id,title,metric,target_value,current_value,start_date,target_date,status,created_at,updated_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("growth_goals query failed:", error.message);
        return null;
      }

      return data as unknown as GrowthGoal | null;
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Fetches the latest video stats for the workspace. */
export function useYouTubeVideoStats(limit = 50) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-video-stats", workspaceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("id,workspace_id,youtube_video_id,title,views,likes,comments,watch_time_minutes,ctr_percent,avg_view_duration_seconds,published_at,fetched_at")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeVideoStats[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Triggers a YouTube sync via the Edge Function. */
export function useSyncYouTube() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("youtube-sync", {
        body: { workspace_id: workspaceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-stats"] });
      queryClient.invalidateQueries({ queryKey: ["youtube_channel_stats"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-video-stats"] });
      queryClient.invalidateQueries({ queryKey: ["growth_goals"] });
    },
  });
}
