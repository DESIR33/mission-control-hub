import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const q = (table: string) => (supabase as any).from(table);

export interface SrtSegment {
  index: number;
  start: string;
  end: string;
  text: string;
}

export interface VideoSubtitle {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string;
  language: string;
  srt_content: string;
  parsed_segments: SrtSegment[];
  created_at: string;
}

function parseSrt(srt: string): SrtSegment[] {
  const segments: SrtSegment[] = [];
  const blocks = srt.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const index = parseInt(lines[0], 10);
    const timeParts = lines[1].split(" --> ");
    if (timeParts.length !== 2) continue;
    segments.push({
      index,
      start: timeParts[0].trim(),
      end: timeParts[1].trim(),
      text: lines.slice(2).join(" ").trim(),
    });
  }
  return segments;
}

export function useVideoSubtitles(youtubeVideoId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoSubtitle[]>({
    queryKey: ["video-subtitles", workspaceId, youtubeVideoId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = q("video_subtitles").select("*").eq("workspace_id", workspaceId);
      if (youtubeVideoId) query = query.eq("youtube_video_id", youtubeVideoId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useUploadSubtitle() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { youtube_video_id: string; video_title: string; language: string; srt_content: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const parsed = parseSrt(data.srt_content);
      const { error } = await q("video_subtitles").insert({
        workspace_id: workspaceId,
        youtube_video_id: data.youtube_video_id,
        video_title: data.video_title,
        language: data.language,
        srt_content: data.srt_content,
        parsed_segments: parsed,
      });
      if (error) throw error;
      return { segments: parsed.length };
    },
    onSuccess: (data) => { toast.success(`Subtitle uploaded (${data.segments} segments)`); qc.invalidateQueries({ queryKey: ["video-subtitles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export { parseSrt };
