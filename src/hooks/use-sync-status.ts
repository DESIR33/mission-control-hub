import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { differenceInHours } from "date-fns";

export type SyncHealthStatus = "healthy" | "stale" | "critical" | "never";

export interface SyncTypeStatus {
  syncType: string;
  lastSyncTime: string | null;
  status: "completed" | "error" | "syncing" | "idle";
  health: SyncHealthStatus;
  hoursSinceSync: number | null;
}

export interface SyncOverview {
  types: SyncTypeStatus[];
  overallHealth: SyncHealthStatus;
  lastSyncFormatted: string;
  isSyncing: boolean;
}

function computeHealth(hoursSince: number | null): SyncHealthStatus {
  if (hoursSince == null) return "never";
  if (hoursSince <= 24) return "healthy";
  if (hoursSince <= 48) return "stale";
  return "critical";
}

function formatTimeSince(hours: number | null): string {
  if (hours == null) return "Never synced";
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function useSyncStatusData() {
  const { workspaceId } = useWorkspace();

  const { data: syncLogs = [], isLoading } = useQuery({
    queryKey: ["sync-status-logs", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_sync_logs" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        workspace_id: string;
        sync_type: string;
        status: string;
        completed_at: string | null;
        started_at: string | null;
        error_message: string | null;
        records_synced: number | null;
      }>;
    },
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const logs = query.state.data as any[] | undefined;
      const isSyncing = logs?.some((l: any) => l.status === "syncing");
      return isSyncing ? 10_000 : 300_000;
    },
    staleTime: 60_000,
  });

  const overview = useMemo((): SyncOverview => {
    const syncTypes = ["channel_stats", "video_analytics", "comments"];
    const now = new Date();

    const types: SyncTypeStatus[] = syncTypes.map((syncType) => {
      // Find the latest successful log for this type
      const latestSuccess = syncLogs.find(
        (log) => log.sync_type === syncType && log.status === "completed"
      );
      const latestAny = syncLogs.find((log) => log.sync_type === syncType);

      const lastSyncTime = latestSuccess?.completed_at ?? null;
      const hoursSinceSync = lastSyncTime
        ? differenceInHours(now, new Date(lastSyncTime))
        : null;
      const health = computeHealth(hoursSinceSync);
      const status = (latestAny?.status ?? "idle") as SyncTypeStatus["status"];

      return { syncType, lastSyncTime, status, health, hoursSinceSync };
    });

    // Overall health is the worst of all types
    const healthOrder: SyncHealthStatus[] = ["critical", "never", "stale", "healthy"];
    const overallHealth = healthOrder.find((h) =>
      types.some((t) => t.health === h)
    ) ?? "never";

    // Most recent sync across all types
    const mostRecent = types.reduce<number | null>((best, t) => {
      if (t.hoursSinceSync == null) return best;
      if (best == null) return t.hoursSinceSync;
      return Math.min(best, t.hoursSinceSync);
    }, null);

    const isSyncing = types.some((t) => t.status === "syncing");

    return {
      types,
      overallHealth,
      lastSyncFormatted: `Last sync: ${formatTimeSince(mostRecent)}`,
      isSyncing,
    };
  }, [syncLogs]);

  return { data: overview, isLoading };
}

export function useTriggerManualSync() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("youtube-sync", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("YouTube sync triggered successfully");
      queryClient.invalidateQueries({ queryKey: ["sync-status-logs"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-video-analytics"] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });
}
