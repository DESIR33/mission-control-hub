import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface VideoSeries {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  items?: VideoSeriesItem[];
}

export interface VideoSeriesItem {
  id: string;
  series_id: string;
  youtube_video_id: string;
  sort_order: number;
}

export function useVideoSeries() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoSeries[]>({
    queryKey: ["video-series", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("video_series")
        .select("*, video_series_items(id, series_id, youtube_video_id, sort_order)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        items: s.video_series_items ?? [],
      })) as VideoSeries[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateVideoSeries() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("video_series").insert({ workspace_id: workspaceId, ...data });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Series created");
      qc.invalidateQueries({ queryKey: ["video-series"] });
    },
  });
}

export function useAddVideoToSeries() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seriesId, youtubeVideoId }: { seriesId: string; youtubeVideoId: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("video_series_items").insert({
        workspace_id: workspaceId,
        series_id: seriesId,
        youtube_video_id: youtubeVideoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video added to series");
      qc.invalidateQueries({ queryKey: ["video-series"] });
    },
  });
}

export function useRemoveVideoFromSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await query("video_series_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video removed from series");
      qc.invalidateQueries({ queryKey: ["video-series"] });
    },
  });
}
