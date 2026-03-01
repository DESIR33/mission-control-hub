import { useDealVelocity, useDealStageHistory } from "@/hooks/use-deal-velocity";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-500",
  qualification: "bg-cyan-500",
  proposal: "bg-amber-500",
  negotiation: "bg-orange-500",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-red-500",
};

export function PipelineVelocity() {
  const { data, isLoading } = useDealVelocity();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.stageVelocities.length === 0) return null;

  const maxDays = Math.max(...data.stageVelocities.map((s) => s.avgDays), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Pipeline Velocity</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Avg cycle: <span className="font-mono font-semibold text-foreground">{data.avgCycleTime}d</span>
          </span>
          {data.bottleneck && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Bottleneck: {STAGE_LABELS[data.bottleneck] ?? data.bottleneck}
            </span>
          )}
        </div>
      </div>

      {/* Stage velocity bars */}
      <div className="flex items-end gap-2">
        {data.stageVelocities.map((sv, i) => (
          <div key={sv.stage} className="flex-1 flex flex-col items-center">
            <div className="relative w-full flex flex-col items-center">
              <span className="text-xs font-mono font-semibold text-foreground mb-1">{sv.avgDays}d</span>
              <div
                className={`w-full rounded-t-md ${STAGE_COLORS[sv.stage] ?? "bg-muted"} transition-all`}
                style={{ height: `${Math.max((sv.avgDays / maxDays) * 80, 8)}px`, opacity: data.bottleneck === sv.stage ? 1 : 0.7 }}
              />
            </div>
            <div className="w-full border-t border-border pt-1.5 text-center">
              <p className="text-[10px] text-muted-foreground leading-tight">{STAGE_LABELS[sv.stage] ?? sv.stage}</p>
              <p className="text-[10px] text-muted-foreground">{sv.dealCount} deals</p>
            </div>
            {i < data.stageVelocities.length - 1 && data.stageConversions[i] && (
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 hidden">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Conversion rates */}
      {data.stageConversions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
          {data.stageConversions.map((c) => (
            <span key={`${c.from}-${c.to}`} className="text-[10px] text-muted-foreground">
              {STAGE_LABELS[c.from] ?? c.from} → {STAGE_LABELS[c.to] ?? c.to}:{" "}
              <span className="font-mono font-semibold text-foreground">{c.rate}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function DealStageTimeline({ dealId }: { dealId: string }) {
  const { data: history = [], isLoading } = useDealStageHistory(dealId);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (history.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" /> Stage History
      </p>
      <div className="space-y-0.5">
        {history.map((h, i) => {
          const nextTime = i < history.length - 1 ? new Date(history[i + 1].changed_at).getTime() : Date.now();
          const days = Math.round((nextTime - new Date(h.changed_at).getTime()) / (1000 * 60 * 60 * 24) * 10) / 10;
          return (
            <div key={h.id} className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${STAGE_COLORS[h.to_stage] ?? "bg-muted"}`} />
              <span className="text-foreground capitalize">{STAGE_LABELS[h.to_stage] ?? h.to_stage}</span>
              <span className="text-muted-foreground font-mono">{days}d</span>
              <span className="text-muted-foreground">
                {new Date(h.changed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
