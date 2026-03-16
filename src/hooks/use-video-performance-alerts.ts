import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface VideoPerformanceAlert {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  alert_type: "trending" | "underperforming" | "milestone";
  message: string;
  metric_name: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  created_at: string;
}

export function useVideoPerformanceAlerts() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoPerformanceAlert[]>({
    queryKey: ["video-performance-alerts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("video_performance_alerts")
        .select("id, workspace_id, youtube_video_id, alert_type, message, metric_name, metric_value, threshold_value, is_read, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as VideoPerformanceAlert[];
    },
    enabled: !!workspaceId,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("video_performance_alerts").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-performance-alerts"] }),
  });
}

export interface ContentDecayAlert {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string;
  decay_type: string;
  current_value: number | null;
  previous_value: number | null;
  decline_percent: number | null;
  suggested_actions: string[];
  status: "active" | "dismissed" | "actioned";
  created_at: string;
  actioned_at: string | null;
}

export function useContentDecayAlerts() {
  const { workspaceId } = useWorkspace();
  return useQuery<ContentDecayAlert[]>({
    queryKey: ["content-decay-alerts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("content_decay_alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("decline_percent", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ContentDecayAlert[];
    },
    enabled: !!workspaceId,
  });
}

export function useDismissDecayAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "dismissed" | "actioned" }) => {
      const { error } = await query("content_decay_alerts")
        .update({ status, actioned_at: status === "actioned" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-decay-alerts"] }),
  });
}

export interface VideoSponsorSegment {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  company_id: string | null;
  deal_id: string | null;
  start_seconds: number;
  end_seconds: number;
  segment_type: string;
  estimated_viewers: number | null;
  retention_at_segment: number | null;
  created_at: string;
}

export function useVideoSponsorSegments(videoId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoSponsorSegment[]>({
    queryKey: ["video-sponsor-segments", workspaceId, videoId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("video_sponsor_segments").select("*").eq("workspace_id", workspaceId);
      if (videoId) q = q.eq("youtube_video_id", videoId);
      q = q.order("start_seconds");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VideoSponsorSegment[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSponsorSegment() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { youtube_video_id: string; company_id?: string; deal_id?: string; start_seconds: number; end_seconds: number; segment_type: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("video_sponsor_segments").insert({ workspace_id: workspaceId, ...data });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-sponsor-segments"] }),
  });
}
