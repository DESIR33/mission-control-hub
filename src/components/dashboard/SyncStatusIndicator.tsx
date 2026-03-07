import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSyncStatusData, useTriggerManualSync, type SyncHealthStatus } from "@/hooks/use-sync-status";

const healthDot: Record<SyncHealthStatus, string> = {
  healthy: "bg-green-400",
  stale: "bg-yellow-400",
  critical: "bg-red-400",
  never: "bg-gray-400",
};

const healthLabel: Record<SyncHealthStatus, string> = {
  healthy: "Synced recently",
  stale: "Sync is stale (24-48h)",
  critical: "Sync overdue (48h+)",
  never: "Never synced",
};

const syncTypeLabel: Record<string, string> = {
  channel_stats: "Channel Stats",
  video_analytics: "Video Analytics",
  comments: "Comments",
};

function SyncTypeIcon({ health }: { health: SyncHealthStatus }) {
  switch (health) {
    case "healthy":
      return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case "stale":
      return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    case "critical":
      return <XCircle className="w-3 h-3 text-red-400" />;
    default:
      return <Circle className="w-3 h-3 text-gray-400" />;
  }
}

export function SyncStatusIndicator() {
  const { data: overview, isLoading } = useSyncStatusData();
  const triggerSync = useTriggerManualSync();

  if (isLoading) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={() => triggerSync.mutate()}
            disabled={triggerSync.isPending || overview.isSyncing}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  overview.isSyncing ? "animate-ping bg-blue-400" : healthDot[overview.overallHealth]
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  overview.isSyncing ? "bg-blue-400" : healthDot[overview.overallHealth]
                }`}
              />
            </span>
            <span className="hidden sm:inline">
              {overview.isSyncing ? "Syncing..." : overview.lastSyncFormatted}
            </span>
            <RefreshCw
              className={`w-3 h-3 ${triggerSync.isPending || overview.isSyncing ? "animate-spin" : ""}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="p-3 space-y-2 max-w-[220px]">
          <p className="text-xs font-semibold">YouTube Sync Health</p>
          <p className="text-xs text-muted-foreground">{healthLabel[overview.overallHealth]}</p>
          <div className="space-y-1.5 pt-1 border-t border-border">
            {overview.types.map((t) => (
              <div key={t.syncType} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <SyncTypeIcon health={t.health} />
                  <span className="text-xs">{syncTypeLabel[t.syncType] ?? t.syncType}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t.hoursSinceSync != null
                    ? t.hoursSinceSync < 1
                      ? "now"
                      : t.hoursSinceSync < 24
                      ? `${Math.round(t.hoursSinceSync)}h`
                      : `${Math.round(t.hoursSinceSync / 24)}d`
                    : "--"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">Click to sync now</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
