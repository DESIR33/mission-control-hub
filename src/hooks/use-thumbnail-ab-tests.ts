import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const q = (table: string) => (supabase as any).from(table);

export interface ThumbnailAbTest {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string;
  variant_a_url: string;
  variant_b_url: string;
  variant_a_ctr: number | null;
  variant_b_ctr: number | null;
  variant_a_impressions: number;
  variant_b_impressions: number;
  winner: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export function useThumbnailAbTests() {
  const { workspaceId } = useWorkspace();
  return useQuery<ThumbnailAbTest[]>({
    queryKey: ["thumbnail-ab-tests", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("thumbnail_ab_tests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateThumbnailAbTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (test: Pick<ThumbnailAbTest, "youtube_video_id" | "video_title" | "variant_a_url" | "variant_b_url">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await q("thumbnail_ab_tests").insert({ workspace_id: workspaceId, ...test });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thumbnail A/B test started"); qc.invalidateQueries({ queryKey: ["thumbnail-ab-tests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateThumbnailAbTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ThumbnailAbTest> & { id: string }) => {
      const { error } = await q("thumbnail_ab_tests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Test updated"); qc.invalidateQueries({ queryKey: ["thumbnail-ab-tests"] }); },
  });
}
