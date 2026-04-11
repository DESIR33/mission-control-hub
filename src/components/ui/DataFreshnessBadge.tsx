import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DatasetSyncRow } from "@/hooks/use-dataset-sync-status";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

interface DataFreshnessBadgeProps {
  status: DatasetSyncRow | undefined;
  cadenceLabel?: string;
  canRefresh: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function DataFreshnessBadge({
  status,
  cadenceLabel = "Updated daily",
  canRefresh,
  onRefresh,
  isRefreshing,
  className,
}: DataFreshnessBadgeProps) {
  const lastSync = status?.last_successful_sync_at;
  const hasError = !!status?.last_error;

  const timeAgo = lastSync
    ? safeFormatDistanceToNow(lastSync, { addSuffix: true })
    : null;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 font-normal text-xs",
              hasError && "border-destructive/50 text-destructive"
            )}
          >
            {hasError ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {timeAgo ? `Synced ${timeAgo}` : cadenceLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{cadenceLabel}</p>
          {lastSync && <p className="text-muted-foreground">Last sync: {new Date(lastSync).toLocaleString()}</p>}
          {hasError && <p className="text-destructive mt-1">Error: {status.last_error}</p>}
          {status?.last_sync_triggered_by && (
            <p className="text-muted-foreground">Via: {status.last_sync_triggered_by}</p>
          )}
        </TooltipContent>
      </Tooltip>

      {onRefresh && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              disabled={!canRefresh || isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canRefresh ? "Refresh now" : "Refresh on cooldown"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
