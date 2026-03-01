import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SrtSegment } from "@/lib/srt-parser";

export interface VideoTranscript {
  id: string;
  workspace_id: string;
  video_queue_id: number | null;
  youtube_video_id: string | null;
  srt_raw: string;
  parsed_segments: SrtSegment[];
  uploaded_at: string;
  created_at: string;
}

export interface RetentionPoint {
  elapsed_seconds: number;
  retention_percent: number;
}

export interface VideoRetentionData {
  id: string;
  workspace_id: string;
  video_queue_id: number | null;
  youtube_video_id: string | null;
  retention_points: RetentionPoint[];
  fetched_at: string;
}

export function useVideoTranscript(videoQueueId: number | string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-transcripts", workspaceId, videoQueueId],
    queryFn: async (): Promise<VideoTranscript | null> => {
      const { data, error } = await supabase
        .from("video_transcripts" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("video_queue_id", String(videoQueueId))
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VideoTranscript | null;
    },
    enabled: !!workspaceId && !!videoQueueId,
  });
}

export function useUploadTranscript() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      videoQueueId: number | string;
      youtubeVideoId?: string | null;
      srtRaw: string;
      parsedSegments: SrtSegment[];
    }) => {
      if (!workspaceId) throw new Error("Workspace not ready");
      const { error } = await supabase.from("video_transcripts" as any).insert({
        workspace_id: workspaceId,
        video_queue_id: Number(input.videoQueueId),
        youtube_video_id: input.youtubeVideoId ?? null,
        srt_raw: input.srtRaw,
        parsed_segments: input.parsedSegments,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-transcripts", workspaceId] }),
  });
}

export function useRetentionData(videoQueueId: number | string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-retention", workspaceId, videoQueueId],
    queryFn: async (): Promise<VideoRetentionData | null> => {
      const { data, error } = await supabase
        .from("video_retention_data" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("video_queue_id", String(videoQueueId))
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VideoRetentionData | null;
    },
    enabled: !!workspaceId && !!videoQueueId,
  });
}

export function useSaveRetentionData() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      videoQueueId: number | string;
      youtubeVideoId?: string | null;
      retentionPoints: RetentionPoint[];
    }) => {
      if (!workspaceId) throw new Error("Workspace not ready");
      const { error } = await supabase.from("video_retention_data" as any).insert({
        workspace_id: workspaceId,
        video_queue_id: Number(input.videoQueueId),
        youtube_video_id: input.youtubeVideoId ?? null,
        retention_points: input.retentionPoints,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-retention", workspaceId] }),
  });
}
