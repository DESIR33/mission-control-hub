import { useState, useMemo } from "react";
import {
  FlaskConical, ArrowUpRight, ArrowDownRight, Minus, Filter,
  TrendingUp, TrendingDown, BookOpen, Eye, MousePointerClick,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";
import { useAllOptimizationExperiments, computeDelta } from "@/hooks/use-optimization-experiments";
import { EXPERIMENT_STATUS_CONFIG } from "@/types/strategist";
import { fmtCount } from "@/lib/chart-theme";
import { useNavigate } from "react-router-dom";
import { safeFormat } from "@/lib/date-utils";

function DeltaIndicator({ baseline, result }: { baseline: number; result: number | null }) {
  const delta = computeDelta(baseline, result);
  if (!delta) return <span className="text-muted-foreground">—</span>;
  const Icon = delta.positive ? ArrowUpRight : delta.percent === 0 ? Minus : ArrowDownRight;
  const color = delta.positive ? "text-green-500" : delta.percent === 0 ? "text-muted-foreground" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {delta.percent > 0 ? "+" : ""}{delta.percent.toFixed(1)}%
    </span>
  );
}

export function ExperimentsComparisonContent() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: experiments = [], isLoading } = useAllOptimizationExperiments(statusFilter);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (typeFilter === "all") return experiments;
    return experiments.filter(e => e.experiment_type === typeFilter);
  }, [experiments, typeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const completed = filtered.filter(e => e.status === "completed" && e.result_ctr != null);
    const improvements = completed.filter(e => (e.result_ctr ?? 0) > e.baseline_ctr);
    const avgCtrDelta = completed.length > 0
      ? completed.reduce((s, e) => s + ((e.result_ctr ?? e.baseline_ctr) - e.baseline_ctr), 0) / completed.length
      : 0;
    const avgViewsDelta = completed.length > 0
      ? completed.reduce((s, e) => {
          if (!e.result_views || e.baseline_views === 0) return s;
          return s + ((e.result_views - e.baseline_views) / e.baseline_views) * 100;
        }, 0) / completed.length
      : 0;
    return {
      total: filtered.length,
      active: filtered.filter(e => e.status === "active").length,
      completed: completed.length,
      improvementRate: completed.length > 0 ? (improvements.length / completed.length) * 100 : 0,
      avgCtrDelta,
      avgViewsDelta,
    };
  }, [filtered]);

  // Chart data: CTR delta per experiment
  const ctrChartData = useMemo(() => {
    return filtered
      .filter(e => e.result_ctr != null)
      .map(e => ({
        name: e.video_title.length > 25 ? e.video_title.slice(0, 25) + "…" : e.video_title,
        delta: Number(((e.result_ctr! - e.baseline_ctr)).toFixed(2)),
        type: e.experiment_type,
        videoId: e.video_id,
      }))
      .slice(0, 20);
  }, [filtered]);

  // Scatter: baseline CTR vs result CTR
  const scatterData = useMemo(() => {
    return filtered
      .filter(e => e.result_ctr != null)
      .map(e => ({
        baselineCtr: e.baseline_ctr,
        resultCtr: e.result_ctr,
        title: e.video_title,
        type: e.experiment_type,
      }));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rolled_back">Rolled Back</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
              <SelectItem value="thumbnail">Thumbnail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Experiments" value={stats.total.toString()} />
        <StatCard label="Active" value={stats.active.toString()} />
        <StatCard label="Completed" value={stats.completed.toString()} />
        <StatCard
          label="Improvement Rate"
          value={`${stats.improvementRate.toFixed(0)}%`}
          positive={stats.improvementRate > 50}
        />
        <StatCard
          label="Avg CTR Δ"
          value={`${stats.avgCtrDelta > 0 ? "+" : ""}${stats.avgCtrDelta.toFixed(2)}%`}
          positive={stats.avgCtrDelta > 0}
        />
        <StatCard
          label="Avg Views Δ"
          value={`${stats.avgViewsDelta > 0 ? "+" : ""}${stats.avgViewsDelta.toFixed(1)}%`}
          positive={stats.avgViewsDelta > 0}
        />
      </div>

      {/* CTR Delta Chart */}
      {ctrChartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4 text-primary" />
            CTR Change per Experiment
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ctrChartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "CTR Δ"]}
              />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                {ctrChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.delta >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Experiments Table */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Video</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Views Δ</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">CTR Δ</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Impressions Δ</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Started</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Lesson</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => {
                  const statusCfg = EXPERIMENT_STATUS_CONFIG[exp.status] || { label: exp.status, color: "" };
                  return (
                    <tr
                      key={exp.id}
                      className="border-t border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/analytics/videos/${exp.video_id}`)}
                    >
                      <td className="p-3 max-w-[200px] truncate text-foreground font-medium">{exp.video_title}</td>
                      <td className="p-3 capitalize">
                        <Badge variant="outline" className="text-[10px]">{exp.experiment_type}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</Badge>
                      </td>
                      <td className="p-3 text-right text-xs">
                        <DeltaIndicator baseline={exp.baseline_views} result={exp.result_views} />
                      </td>
                      <td className="p-3 text-right text-xs">
                        <DeltaIndicator baseline={exp.baseline_ctr} result={exp.result_ctr} />
                      </td>
                      <td className="p-3 text-right text-xs">
                        <DeltaIndicator baseline={exp.baseline_impressions} result={exp.result_impressions} />
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {safeFormat(exp.started_at, "MMM d")}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[150px] truncate">
                        {exp.lesson_learned ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            {exp.lesson_learned}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FlaskConical className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No experiments found. Apply AI optimization suggestions to videos to start tracking performance changes.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-lg font-bold font-mono mt-0.5 ${positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
