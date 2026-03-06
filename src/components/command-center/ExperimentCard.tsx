import { ArrowDown, ArrowUp, Minus, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VideoOptimizationExperiment } from "@/types/strategist";
import { EXPERIMENT_STATUS_CONFIG } from "@/types/strategist";

function DeltaBadge({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground">--</span>;
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 1;
  const Icon = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;
  const color = isNeutral ? "text-muted-foreground" : isPositive ? "text-green-400" : "text-red-400";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function MetricRow({ label, baseline, result, delta }: {
  label: string;
  baseline: number;
  result: number | null;
  delta: number | null;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{fmtNumber(baseline)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="font-medium">{result !== null ? fmtNumber(result) : "--"}</span>
        <DeltaBadge value={delta} />
      </div>
    </div>
  );
}

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function ExperimentCard({
  experiment,
  onRollback,
  isRollingBack,
}: {
  experiment: VideoOptimizationExperiment;
  onRollback?: (id: string) => void;
  isRollingBack?: boolean;
}) {
  const statusConfig = EXPERIMENT_STATUS_CONFIG[experiment.status] || EXPERIMENT_STATUS_CONFIG.active;
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(experiment.started_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const progress = Math.min(100, (daysSinceStart / experiment.measurement_period_days) * 100);
  const delta = experiment.performance_delta;

  const StatusIcon = experiment.status === "active" ? Clock :
    experiment.status === "completed" ? CheckCircle : XCircle;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug truncate">
              {experiment.video_title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {experiment.experiment_type} optimization
            </p>
          </div>
          <Badge className={`shrink-0 text-xs ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Change summary */}
        {experiment.experiment_type === "title" && experiment.new_title && (
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground line-through">{experiment.original_title}</p>
            <p className="text-foreground font-medium">{experiment.new_title}</p>
          </div>
        )}

        {experiment.experiment_type === "thumbnail" && experiment.new_thumbnail_url && (
          <div className="flex gap-2">
            {experiment.original_thumbnail_url && (
              <img src={experiment.original_thumbnail_url} alt="Original" className="w-20 h-12 rounded object-cover opacity-50" />
            )}
            <img src={experiment.new_thumbnail_url} alt="New" className="w-20 h-12 rounded object-cover ring-2 ring-blue-500/50" />
          </div>
        )}

        {/* Metrics comparison */}
        <div className="space-y-1.5">
          <MetricRow
            label="Views"
            baseline={experiment.baseline_views}
            result={experiment.result_views}
            delta={delta?.views ?? null}
          />
          <MetricRow
            label="CTR"
            baseline={experiment.baseline_ctr}
            result={experiment.result_ctr}
            delta={delta?.ctr ?? null}
          />
          <MetricRow
            label="Impressions"
            baseline={experiment.baseline_impressions}
            result={experiment.result_impressions}
            delta={delta?.impressions ?? null}
          />
        </div>

        {/* Progress bar for active experiments */}
        {experiment.status === "active" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Day {daysSinceStart} of {experiment.measurement_period_days}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Lesson learned */}
        {experiment.lesson_learned && (
          <p className="text-xs text-muted-foreground italic bg-muted/50 rounded p-2">
            {experiment.lesson_learned}
          </p>
        )}

        {/* Rollback reason */}
        {experiment.rollback_reason && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded p-2">
            Rolled back: {experiment.rollback_reason}
          </p>
        )}

        {/* Manual rollback button for active experiments */}
        {experiment.status === "active" && onRollback && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onRollback(experiment.id)}
            disabled={isRollingBack}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            {isRollingBack ? "Rolling back..." : "Rollback to Original"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
