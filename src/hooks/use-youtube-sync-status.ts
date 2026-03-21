import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { getAdaptiveRefetchInterval, DATA_FRESHNESS } from "@/config/data-freshness";

export interface SyncStatus {
  id: string;
  sync_type: string;
  status: "idle" | "syncing" | "completed" | "error";
  last_synced_at: string | null;
  started_at: string | null;
  error_message: string | null;
  records_synced: number;
}

export function useSyncStatus() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-sync-status", workspaceId],
    queryFn: async (): Promise<SyncStatus[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("youtube_sync_status" as any)
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []) as unknown as SyncStatus[];
    },
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const statuses = query.state.data as any[] | undefined;
      const isSyncing = statuses?.some((s: any) => s.status === "syncing");
      return getAdaptiveRefetchInterval("syncStatus", !!isSyncing);
    },
    staleTime: DATA_FRESHNESS.syncStatus.staleTime,
  });
}

export function useTriggerSync() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (syncType: string = "analytics") => {
      if (!workspaceId) throw new Error("No workspace");

      // Update status to syncing
      await supabase.from("youtube_sync_status" as any).upsert(
        {
          workspace_id: workspaceId,
          sync_type: syncType,
          status: "syncing",
          started_at: new Date().toISOString(),
          error_message: null,
        } as any,
        { onConflict: "workspace_id,sync_type" },
      );

      // Call edge function
      const { data, error } = await supabase.functions.invoke(
        "youtube-analytics-sync",
        {
          body: {
            workspace_id: workspaceId,
            sync_type: syncType,
            backfill_days: 90,
          },
        },
      );

      if (error) {
        await supabase.from("youtube_sync_status" as any).upsert(
          {
            workspace_id: workspaceId,
            sync_type: syncType,
            status: "error",
            error_message: error.message,
          } as any,
          { onConflict: "workspace_id,sync_type" },
        );
        throw error;
      }

      // Mark completed
      await supabase.from("youtube_sync_status" as any).upsert(
        {
          workspace_id: workspaceId,
          sync_type: syncType,
          status: "completed",
          last_synced_at: new Date().toISOString(),
          records_synced: data?.records_synced ?? 0,
        } as any,
        { onConflict: "workspace_id,sync_type" },
      );

      return data;
    },
    onSuccess: () => {
      toast.success("YouTube analytics synced successfully");
      queryClient.invalidateQueries({ queryKey: ["youtube-sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-video-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-demographics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-traffic-sources"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-geography"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-device-types"] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });
}
