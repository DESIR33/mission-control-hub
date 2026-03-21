import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";

export interface VideoCompanyLink {
  youtube_video_id: string;
  company_id: string;
  company_name: string;
  logo_url: string | null;
}

/**
 * Fetches all video↔company links for the workspace in a single query.
 * Returns a Map<youtubeVideoId, VideoCompanyLink[]> for O(1) lookup.
 */
export function useAllVideoCompanies() {
  const { workspaceId } = useWorkspace();

  const query = useQuery({
    queryKey: ["all-video-companies", workspaceId],
    queryFn: async (): Promise<VideoCompanyLink[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("video_companies")
        .select("youtube_video_id, company_id, companies(id, name, logo_url)")
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        youtube_video_id: row.youtube_video_id,
        company_id: row.company_id,
        company_name: row.companies?.name ?? "Unknown",
        logo_url: row.companies?.logo_url ?? null,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  const lookup = new Map<string, VideoCompanyLink[]>();
  for (const link of query.data ?? []) {
    const existing = lookup.get(link.youtube_video_id);
    if (existing) {
      existing.push(link);
    } else {
      lookup.set(link.youtube_video_id, [link]);
    }
  }

  return { ...query, lookup };
}
