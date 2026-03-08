import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import {
  ArrowUpRight, ArrowDownRight, Minus, FlaskConical, Clock,
  RotateCcw, Eye, MousePointerClick, Timer, BarChart3, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useVideoOptimizationExperiments, useSaveExperimentLesson, computeDelta } from "@/hooks/use-optimization-experiments";
import { useRollbackExperiment } from "@/hooks/use-video-strategist";
import { EXPERIMENT_STATUS_CONFIG } from "@/types/strategist";
import { fmtCount } from "@/lib/chart-theme";

interface Props {
  youtubeVideoId?: string;
}

function DeltaBadge({ delta }: { delta: { percent: number; positive: boolean } | null }) {
  if (!delta) return <span className="text-xs text-muted-foreground">—</span>;
  const Icon = delta.positive ? ArrowUpRight : delta.percent === 0 ? Minus : ArrowDownRight;
  const color = delta.positive ? "text-green-500" : delta.percent === 0 ? "text-muted-foreground" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {delta.percent > 0 ? "+" : ""}{delta.percent.toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, icon: Icon, baseline, result }: {
  label: string;
  icon: React.ElementType;
  baseline: number;
  result: number | null;
}) {
  const delta = computeDelta(baseline, result);
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground">Before: </span>
          <span className="text-sm font-mono font-semibold text-foreground">{fmtCount(baseline)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">After: </span>
          <span className="text-sm font-mono font-semibold text-foreground">{result != null ? fmtCount(result) : "—"}</span>
        </div>
      </div>
      <DeltaBadge delta={delta} />
    </div>
  );
}

function ExperimentCard({ experiment }: { experiment: any }) {
  const [lessonText, setLessonText] = useState(experiment.lesson_learned || "");
  const [editingLesson, setEditingLesson] = useState(false);
  const saveLesson = useSaveExperimentLesson();
  const rollback = useRollbackExperiment();
  const statusConfig = EXPERIMENT_STATUS_CONFIG[experiment.status] || { label: experiment.status, color: "" };
  const daysRunning = differenceInDays(new Date(), new Date(experiment.started_at));

  const chartData = [
    { metric: "Views", before: experiment.baseline_views, after: experiment.result_views },
    { metric: "CTR %", before: experiment.baseline_ctr, after: experiment.result_ctr },
    { metric: "Impressions", before: experiment.baseline_impressions, after: experiment.result_impressions },
  ].filter(d => d.before > 0 || (d.after ?? 0) > 0);

  const typeLabel = experiment.experiment_type?.replace(/_/g, " ") || "multi";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate capitalize">{typeLabel} Experiment</h4>
            <p className="text-xs text-muted-foreground">
              Started {format(new Date(experiment.started_at), "MMM d, yyyy")} · {daysRunning}d running
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${statusConfig.color}`}>{statusConfig.label}</Badge>
          {experiment.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
              onClick={() => rollback.mutate(experiment.id)}
              disabled={rollback.isPending}
            >
              <RotateCcw className="w-3 h-3" /> Rollback
            </Button>
          )}
        </div>
      </div>

      {/* What changed */}
      <div className="space-y-1.5">
        {experiment.original_title && experiment.new_title && experiment.original_title !== experiment.new_title && (
          <div className="text-xs space-y-0.5">
            <p className="text-muted-foreground">Title: <span className="line-through">{experiment.original_title}</span></p>
            <p className="text-foreground font-medium">→ {experiment.new_title}</p>
          </div>
        )}
        {experiment.new_tags && (
          <div className="flex flex-wrap gap-1">
            {experiment.new_tags.map((t: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Views" icon={Eye} baseline={experiment.baseline_views} result={experiment.result_views} />
        <MetricCard label="CTR" icon={MousePointerClick} baseline={experiment.baseline_ctr} result={experiment.result_ctr} />
        <MetricCard label="Impressions" icon={BarChart3} baseline={experiment.baseline_impressions} result={experiment.result_impressions} />
        <MetricCard label="Avg Duration" icon={Timer} baseline={experiment.baseline_avg_view_duration} result={experiment.result_avg_view_duration} />
      </div>

      {/* Before/After chart */}
      {chartData.length > 0 && experiment.result_views != null && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Before vs After</h5>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtCount} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="before" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Before" />
              <Bar dataKey="after" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="After" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lesson learned / Agent feedback */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Lesson Learned (feeds AI agents)</span>
        </div>
        {editingLesson ? (
          <div className="space-y-2">
            <Textarea
              value={lessonText}
              onChange={(e) => setLessonText(e.target.value)}
              placeholder="What did we learn? e.g. 'Questions in titles boost CTR by ~15% for tutorial content'"
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  saveLesson.mutate({ experimentId: experiment.id, lesson: lessonText });
                  setEditingLesson(false);
                }}
                disabled={saveLesson.isPending}
              >
                Save Lesson
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingLesson(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setEditingLesson(true)}
          >
            {experiment.lesson_learned || "Click to add a lesson learned — this will be used by AI agents for future optimizations."}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoOptimizationTracker({ youtubeVideoId }: Props) {
  const { data: experiments = [], isLoading } = useVideoOptimizationExperiments(youtubeVideoId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Clock className="w-5 h-5 animate-pulse mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading optimization experiments…</p>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <FlaskConical className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No optimization experiments yet. Apply an AI suggestion to automatically start tracking before/after performance.
        </p>
      </div>
    );
  }

  const active = experiments.filter(e => e.status === "active");
  const completed = experiments.filter(e => e.status !== "active");

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            Active Experiments ({active.length})
          </h3>
          {active.map(exp => <ExperimentCard key={exp.id} experiment={exp} />)}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Completed ({completed.length})
          </h3>
          {completed.map(exp => <ExperimentCard key={exp.id} experiment={exp} />)}
        </div>
      )}
    </div>
  );
}
