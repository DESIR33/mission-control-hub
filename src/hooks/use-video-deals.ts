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
 * Fetches deals linked to this video via:
 * 1. video_companies table (company_id match)
 * 2. Notes containing the YouTube video ID (text search)
 * Results are deduplicated by deal ID.
 */
export function useVideoDeals(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-deals", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoDeal[]> => {
      if (!workspaceId || !youtubeVideoId) return [];

      const mapDeal = (d: any): VideoDeal => ({
        id: d.id,
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        expected_close_date: d.expected_close_date,
        company: d.companies ?? null,
      });

      const dealMap = new Map<string, VideoDeal>();

      // Path 1: Find deals via video_companies (company_id match)
      const { data: vcRows } = await supabase
        .from("video_companies")
        .select("company_id")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId);

      if (vcRows && vcRows.length > 0) {
        const companyIds = vcRows.map((r) => r.company_id);
        const { data: companyDeals } = await supabase
          .from("deals")
          .select("id, title, value, currency, stage, expected_close_date, companies(id, name, logo_url)")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .in("company_id", companyIds);

        for (const d of companyDeals ?? []) {
          dealMap.set(d.id, mapDeal(d));
        }
      }

      // Path 2: Search deals whose notes mention this video ID
      const { data: noteDeals } = await supabase
        .from("deals")
        .select("id, title, value, currency, stage, expected_close_date")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .ilike("notes", `%${youtubeVideoId}%`);

      for (const d of noteDeals ?? []) {
        if (!dealMap.has(d.id)) {
          dealMap.set(d.id, mapDeal(d));
        }
      }

      return Array.from(dealMap.values());
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
