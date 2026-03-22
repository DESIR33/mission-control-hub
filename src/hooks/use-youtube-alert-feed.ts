import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AlertFeedItem {
  id: string;
  workspace_id: string;
  alert_type: "views_spike" | "ctr_drop" | "sub_surge" | "engagement_anomaly" | "revenue_milestone";
  severity: "info" | "warning" | "celebration";
  title: string;
  description: string | null;
  metric_name: string | null;
  metric_value: number | null;
  is_read: boolean;
  created_at: string;
}

export function useYouTubeAlertFeed(limit = 10) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube-alert-feed", workspaceId, limit],
    queryFn: async (): Promise<AlertFeedItem[]> => {
      // Table does not exist yet — return empty until migration is created
      return [];
    },
    enabled: !!workspaceId,
  });
}

export function useMarkAlertFeedRead() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("youtube_alerts" as any)
        .update({ is_read: true } as any)
        .eq("id", alertId)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-alert-feed"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts-unread"] });
    },
  });
}

export function useMarkAllAlertFeedRead() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("youtube_alerts" as any)
        .update({ is_read: true } as any)
        .eq("workspace_id", workspaceId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-alert-feed"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts-unread"] });
    },
  });
}
