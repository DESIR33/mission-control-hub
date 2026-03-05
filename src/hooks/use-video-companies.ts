import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoCompany {
  id: string;
  youtube_video_id: string;
  company_id: string;
  company?: { id: string; name: string; logo_url: string | null };
}

export function useVideoCompanies(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-companies", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoCompany[]> => {
      if (!workspaceId || !youtubeVideoId) return [];

      const { data, error } = await supabase
        .from("video_companies")
        .select("id, youtube_video_id, company_id, companies(id, name, logo_url)")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        youtube_video_id: row.youtube_video_id,
        company_id: row.company_id,
        company: row.companies ?? null,
      }));
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}

export function useLinkVideoCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ youtubeVideoId, companyId }: { youtubeVideoId: string; companyId: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("video_companies")
        .insert({
          workspace_id: workspaceId,
          youtube_video_id: youtubeVideoId,
          company_id: companyId,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["video-companies", workspaceId, vars.youtubeVideoId] });
    },
  });
}

export function useUnlinkVideoCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, youtubeVideoId }: { id: string; youtubeVideoId: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("video_companies")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      return youtubeVideoId;
    },
    onSuccess: (youtubeVideoId) => {
      queryClient.invalidateQueries({ queryKey: ["video-companies", workspaceId, youtubeVideoId] });
    },
  });
}
