import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface DatasetSyncRow {
  dataset_key: string;
  last_successful_sync_at: string | null;
  next_eligible_sync_at: string | null;
  last_sync_triggered_by: string | null;
  last_error: string | null;
}

/**
 * Fetches freshness / sync-status rows for the current workspace.
 * Optionally filtered to specific dataset keys.
 */
export function useDatasetSyncStatus(datasetKeys?: string[]) {
  const { workspaceId } = useWorkspace();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["dataset-sync-status", workspaceId, datasetKeys],
    queryFn: async () => {
      let q = supabase
        .from("dataset_sync_status" as any)
        .select("dataset_key, last_successful_sync_at, next_eligible_sync_at, last_sync_triggered_by, last_error")
        .eq("workspace_id", workspaceId!);

      if (datasetKeys && datasetKeys.length > 0) {
        q = q.in("dataset_key", datasetKeys);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DatasetSyncRow[];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  /** Get a single dataset's status. */
  function getStatus(key: string): DatasetSyncRow | undefined {
    return rows.find((r) => r.dataset_key === key);
  }

  /** Check if manual refresh is allowed (cooldown elapsed). */
  function canRefreshNow(key: string): boolean {
    const row = getStatus(key);
    if (!row?.next_eligible_sync_at) return true;
    return new Date(row.next_eligible_sync_at) <= new Date();
  }

  return { rows, isLoading, getStatus, canRefreshNow };
}

/**
 * Mutation to trigger a manual refresh for a daily dataset.
 * Checks server-side cooldown before invoking the sync function.
 */
export function useManualDatasetRefresh() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ datasetKey, edgeFunctionName }: { datasetKey: string; edgeFunctionName: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      // Server-side cooldown check
      const { data: allowed, error: checkErr } = await supabase.rpc(
        "can_manual_refresh" as any,
        { p_workspace_id: workspaceId, p_dataset_key: datasetKey }
      );
      if (checkErr) throw checkErr;
      if (!allowed) throw new Error("Refresh is on cooldown. Please wait before trying again.");

      // Invoke the edge function
      const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
        body: { workspace_id: workspaceId, triggered_by: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(`${vars.datasetKey} refreshed successfully`);
      qc.invalidateQueries({ queryKey: ["dataset-sync-status"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Refresh failed");
    },
  });
}
