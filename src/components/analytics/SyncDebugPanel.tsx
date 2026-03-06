import { useState } from "react";
import { RefreshCw, Bug, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncYouTubeAnalytics } from "@/hooks/use-youtube-analytics-api";

interface SyncResult {
  ok: boolean;
  channelRowsUpserted: number;
  videoRowsUpserted: number;
  demographicsUpserted: number;
  trafficSourcesUpserted: number;
  geographyUpserted: number;
  devicesUpserted: number;
  retentionVideos: number;
  errors: string[];
  sampleChannelRow: any;
  sampleVideoRow: any;
  period: { start_date: string; end_date: string } | null;
}

export function SyncDebugPanel() {
  const [result, setResult] = useState<SyncResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const syncAnalytics = useSyncYouTubeAnalytics();

  const handleTestSync = async () => {
    setResult(null);
    try {
      const data = await syncAnalytics.mutateAsync({ start_date: daysAgo(7), end_date: daysAgo(1) });
      setResult(data as SyncResult);
    } catch (err: any) {
      setResult({
        ok: false,
        channelRowsUpserted: 0,
        videoRowsUpserted: 0,
        demographicsUpserted: 0,
        trafficSourcesUpserted: 0,
        geographyUpserted: 0,
        devicesUpserted: 0,
        retentionVideos: 0,
        errors: [err.message || String(err)],
        sampleChannelRow: null,
        sampleVideoRow: null,
        period: null,
      });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Sync Debug Panel</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestSync}
            disabled={syncAnalytics.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncAnalytics.isPending ? "animate-spin" : ""}`} />
            {syncAnalytics.isPending ? "Syncing..." : "Run test sync (last 7 days)"}
          </Button>
          {result && (
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-2">
          {/* Status */}
          <div className="flex items-center gap-2">
            {result.ok || result.errors.length === 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            <span className={`text-sm font-medium ${result.ok || result.errors.length === 0 ? "text-green-500" : "text-destructive"}`}>
              {result.ok || result.errors.length === 0 ? "Sync succeeded" : `Sync completed with ${result.errors.length} error(s)`}
            </span>
          </div>

          {/* Row counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label="Channel rows" value={result.channelRowsUpserted} />
            <Stat label="Video rows" value={result.videoRowsUpserted} />
            <Stat label="Demographics" value={result.demographicsUpserted} />
            <Stat label="Traffic sources" value={result.trafficSourcesUpserted} />
            <Stat label="Geography" value={result.geographyUpserted} />
            <Stat label="Devices" value={result.devicesUpserted} />
            <Stat label="Retention videos" value={result.retentionVideos} />
          </div>

          {/* Period */}
          {result.period && (
            <p className="text-xs text-muted-foreground">
              Period: {result.period.start_date} → {result.period.end_date}
            </p>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 font-mono break-all">
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Sample rows */}
          {expanded && (
            <div className="space-y-2">
              {result.sampleChannelRow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sample channel row:</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto font-mono">
                    {JSON.stringify(result.sampleChannelRow, null, 2)}
                  </pre>
                </div>
              )}
              {result.sampleVideoRow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sample video row:</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto font-mono">
                    {JSON.stringify(result.sampleVideoRow, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-muted/50 px-2 py-1.5">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-semibold ${value > 0 ? "text-foreground" : "text-muted-foreground"}`}>{value}</span>
    </div>
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
