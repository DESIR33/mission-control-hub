import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncStatus, useTriggerSync } from "@/hooks/use-youtube-sync-status";
import type { SyncStatus } from "@/hooks/use-youtube-sync-status";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

function getAggregatedStatus(statuses: SyncStatus[]): {
  overall: SyncStatus["status"];
  lastSynced: string | null;
  totalRecords: number;
  errorMessage: string | null;
} {
  if (statuses.length === 0) {
    return { overall: "idle", lastSynced: null, totalRecords: 0, errorMessage: null };
  }

  const isSyncing = statuses.some((s) => s.status === "syncing");
  const hasError = statuses.some((s) => s.status === "error");

  // Find the most recent last_synced_at across all sync types
  const syncedDates = statuses
    .map((s) => s.last_synced_at)
    .filter((d): d is string => d !== null)
    .sort()
    .reverse();

  const totalRecords = statuses.reduce((sum, s) => sum + (s.records_synced ?? 0), 0);

  const errorStatus = statuses.find((s) => s.status === "error");

  let overall: SyncStatus["status"] = "idle";
  if (isSyncing) overall = "syncing";
  else if (hasError) overall = "error";
  else if (syncedDates.length > 0) overall = "completed";

  return {
    overall,
    lastSynced: syncedDates[0] ?? null,
    totalRecords,
    errorMessage: errorStatus?.error_message ?? null,
  };
}

export function SyncStatusBar() {
  const { data: statuses = [], isLoading } = useSyncStatus();
  const triggerSync = useTriggerSync();

  const { overall, lastSynced, totalRecords, errorMessage } = getAggregatedStatus(statuses);
  const isSyncing = overall === "syncing" || triggerSync.isPending;

  const handleSync = () => {
    if (!isSyncing) {
      triggerSync.mutate("analytics");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Loading sync status...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      {/* Status icon */}
      {overall === "syncing" || isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      ) : overall === "error" ? (
        <AlertCircle className="h-4 w-4 text-destructive" />
      ) : overall === "completed" ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground" />
      )}

      {/* Status text */}
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {isSyncing ? (
          <span className="font-medium text-blue-500">Syncing YouTube analytics...</span>
        ) : overall === "error" ? (
          <span className="font-medium text-destructive">
            Sync failed{errorMessage ? `: ${errorMessage}` : ""}
          </span>
        ) : lastSynced ? (
          <span className="text-muted-foreground">
            Last synced{" "}
            <span className="font-medium text-foreground">
              {safeFormatDistanceToNow(lastSynced, { addSuffix: true })}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No sync data yet</span>
        )}

        {/* Records synced count */}
        {totalRecords > 0 && !isSyncing && (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{totalRecords.toLocaleString()}</span>{" "}
            records synced
          </span>
        )}
      </div>

      {/* Sync / Retry button */}
      <Button
        variant={overall === "error" ? "destructive" : "outline"}
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : overall === "error" ? "Retry Sync" : "Sync Now"}
      </Button>
    </div>
  );
}
