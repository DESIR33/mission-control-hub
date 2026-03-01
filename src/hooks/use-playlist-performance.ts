import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface PlaylistAnalytics {
  id: string;
  workspace_id: string;
  playlist_id: string;
  playlist_title: string;
  video_count: number;
  total_views: number;
  avg_views_per_video: number | null;
  total_watch_time_minutes: number | null;
  avg_completion_rate: number | null;
  subscriber_gain: number | null;
  top_entry_video: string | null;
  drop_off_video: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistOptimization {
  playlists: PlaylistAnalytics[];
  topPerformer: PlaylistAnalytics | null;
  underperformers: PlaylistAnalytics[];
  totalViews: number;
  avgCompletionRate: number;
  insights: string[];
}

export function usePlaylistAnalytics() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["playlist-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_analytics" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("total_views", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlaylistAnalytics[];
    },
    enabled: !!workspaceId,
  });
}

export function usePlaylistOptimization() {
  const { data: playlists = [], isLoading } = usePlaylistAnalytics();

  const optimization: PlaylistOptimization | null =
    playlists.length > 0
      ? (() => {
          const totalViews = playlists.reduce((s, p) => s + Number(p.total_views), 0);
          const completionRates = playlists
            .filter((p) => p.avg_completion_rate != null)
            .map((p) => Number(p.avg_completion_rate));
          const avgCompletionRate =
            completionRates.length > 0
              ? completionRates.reduce((s, r) => s + r, 0) / completionRates.length
              : 0;

          const sorted = [...playlists].sort((a, b) => Number(b.total_views) - Number(a.total_views));
          const topPerformer = sorted[0] ?? null;
          const underperformers = sorted.filter(
            (p) => p.avg_completion_rate != null && Number(p.avg_completion_rate) < 30
          );

          const insights: string[] = [];
          if (topPerformer) {
            insights.push(
              `"${topPerformer.playlist_title}" is your top playlist with ${Number(topPerformer.total_views).toLocaleString()} views.`
            );
          }
          if (underperformers.length > 0) {
            insights.push(
              `${underperformers.length} playlist(s) have <30% completion — reorder videos or improve thumbnails.`
            );
          }
          const withDropoff = playlists.filter((p) => p.drop_off_video);
          if (withDropoff.length > 0) {
            insights.push(
              `Review drop-off videos to find what causes viewers to leave mid-playlist.`
            );
          }

          return { playlists, topPerformer, underperformers, totalViews, avgCompletionRate, insights };
        })()
      : null;

  return { data: optimization, isLoading };
}

export function useCreatePlaylistAnalytics() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playlist: Partial<PlaylistAnalytics>) => {
      const { data, error } = await supabase
        .from("playlist_analytics" as any)
        .insert({ ...playlist, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlist-analytics"] }),
  });
}

export function useUpdatePlaylistAnalytics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlaylistAnalytics> & { id: string }) => {
      const { data, error } = await supabase
        .from("playlist_analytics" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlist-analytics"] }),
  });
}
