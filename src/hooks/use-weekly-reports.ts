import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface WeeklyReport {
  id: string;
  workspace_id: string;
  report_date: string;
  report_data: {
    subscriber_count?: number;
    subscriber_change?: number;
    views_gained?: number;
    videos_published?: number;
    deals_closed?: number;
    revenue_earned?: number;
    top_video?: { title: string; views: number } | null;
    engagement_avg?: number;
    pipeline_status?: Record<string, number>;
    goal_progress?: number;
  };
  created_at: string;
}

export function useWeeklyReports() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["weekly-reports", workspaceId],
    queryFn: async (): Promise<WeeklyReport[]> => {
      const { data, error } = await supabase
        .from("weekly_reports" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("report_date", { ascending: false })
        .limit(52);
      if (error) throw error;
      return (data ?? []) as unknown as WeeklyReport[];
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateWeeklyReport() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("weekly-report", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly-reports", workspaceId] }),
  });
}
