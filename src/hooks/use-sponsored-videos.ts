import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";

/**
 * Returns a Set of youtube_video_ids that are linked to any deal (sponsored videos).
 */
export function useSponsoredVideos() {
  const { workspaceId } = useWorkspace();

  const { data: sponsoredSet = new Set<string>(), isLoading } = useQuery({
    queryKey: ["sponsored-videos", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_videos" as any)
        .select("youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => d.youtube_video_id as string));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });

  return { sponsoredSet, isLoading };
}
