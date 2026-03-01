import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: string;
  expected_close_date: string | null;
  company?: { id: string; name: string; logo_url: string | null } | null;
}

/**
 * Fetches deals that reference this video via notes containing the video ID.
 * Since there's no direct video_id FK on deals, we search deals with notes mentioning the video.
 */
export function useVideoDeals(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-deals", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoDeal[]> => {
      if (!workspaceId || !youtubeVideoId) return [];

      // Search deals whose notes mention this video ID
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, currency, stage, expected_close_date, companies(id, name, logo_url)")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .ilike("notes", `%${youtubeVideoId}%`);

      if (error) throw error;

      return (data ?? []).map((d: any) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        expected_close_date: d.expected_close_date,
        company: d.companies ?? null,
      }));
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
