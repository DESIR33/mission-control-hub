import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface RetentionPoint {
  elapsed_ratio: number;
  audience_retention: number;
}

export function useVideoRetention(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-retention", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<RetentionPoint[]> => {
      if (!workspaceId || !youtubeVideoId) return [];

      const { data, error } = await supabase
        .from("youtube_video_retention" as any)
        .select("elapsed_ratio, audience_retention")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("elapsed_ratio", { ascending: true });

      if (error) {
        console.warn("Retention query failed:", error.message);
        return [];
      }

      return (data ?? []).map((d: any) => ({
        elapsed_ratio: Number(d.elapsed_ratio),
        audience_retention: Number(d.audience_retention),
      }));
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
