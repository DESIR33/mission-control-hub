import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface AudienceOverlapReport {
  id: string;
  workspace_id: string;
  video_a_id: string;
  video_b_id: string;
  overlap_type: "keyword" | "audience" | "topic";
  overlap_score: number;
  shared_keywords: string[];
  recommendation: string | null;
  status: "active" | "dismissed" | "actioned";
  created_at: string;
}

export function useAudienceOverlapReports() {
  const { workspaceId } = useWorkspace();
  return useQuery<AudienceOverlapReport[]>({
    queryKey: ["audience-overlap", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("audience_overlap_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("overlap_score", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AudienceOverlapReport[];
    },
    enabled: !!workspaceId,
  });
}

export function useDismissOverlap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "dismissed" | "actioned" }) => {
      const { error } = await query("audience_overlap_reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audience-overlap"] }),
  });
}
