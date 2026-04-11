import { Clock, CheckCircle, AlertCircle, Database, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { DistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

interface SyncLogEntry {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export function SyncHistoryPanel() {
  const { workspaceId } = useWorkspace();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["youtube-sync-log", workspaceId],
    queryFn: async (): Promise<SyncLogEntry[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("youtube_sync_log" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as SyncLogEntry[];
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <Database className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-xs text-muted-foreground">No sync history yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Sync History
      </h3>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
          >
            {log.status === "completed" ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : log.status === "error" ? (
              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs shrink-0">
                  {log.sync_type}
                </Badge>
                <span className="text-muted-foreground truncate">
                  {safeFormatDistanceToNow(log.started_at, { addSuffix: true })}
                </span>
              </div>
              {log.error_message && (
                <p className="text-destructive text-xs mt-0.5 truncate">
                  {log.error_message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
              {log.records_synced > 0 && (
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {log.records_synced}
                </span>
              )}
              {log.duration_ms != null && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {(log.duration_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
