import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";

export interface YouTubeAlert {
  id: string;
  workspace_id: string;
  alert_type: "views_spike" | "ctr_drop" | "sub_surge" | "engagement_anomaly" | "revenue_milestone";
  severity: "info" | "warning" | "celebration";
  title: string;
  description: string | null;
  youtube_video_id: string | null;
  metric_name: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  action_taken: string | null;
  created_at: string;
}

export function useYouTubeAlerts(limit = 20) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube-alerts", workspaceId, limit],
    queryFn: async (): Promise<YouTubeAlert[]> => {
      const { data, error } = await supabase
        .from("youtube_alerts" as any)
        .select("id, workspace_id, alert_type, severity, title, description, youtube_video_id, metric_name, metric_value, threshold_value, is_read, action_taken, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeAlert[];
    },
    enabled: !!workspaceId,
  });
}

export function useUnreadAlertCount() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube-alerts-unread", workspaceId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("youtube_alerts" as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!workspaceId,
    ...getFreshness("youtubeAlerts"),
  });
}

export function useMarkAlertRead() {
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
      qc.invalidateQueries({ queryKey: ["youtube-alerts"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts-unread"] });
    },
  });
}

export function useMarkAllAlertsRead() {
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
      qc.invalidateQueries({ queryKey: ["youtube-alerts"] });
      qc.invalidateQueries({ queryKey: ["youtube-alerts-unread"] });
    },
  });
}
