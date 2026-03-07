import { useState } from "react";
import {
  Users, Plus, TrendingUp, TrendingDown, Minus,
  BarChart3, Trash2, ExternalLink, Medal,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCompetitorBenchmark, useCreateCompetitor, useDeleteCompetitor,
} from "@/hooks/use-competitor-benchmarking";
import { useSyncCompetitors } from "@/hooks/use-competitor-benchmarking";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fmtCount, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, barDefaults } from "@/lib/chart-theme";

const statusIcon: Record<string, any> = {
  ahead: TrendingUp,
  behind: TrendingDown,
  even: Minus,
};
const statusColor: Record<string, string> = {
  ahead: "text-green-400",
  behind: "text-red-400",
  even: "text-muted-foreground",
};

export function CompetitorBenchmark() {
  const { data: benchmark, isLoading } = useCompetitorBenchmark();
  const createCompetitor = useCreateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();
  const syncCompetitors = useSyncCompetitors();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    channel_name: "",
    channel_url: "",
    subscriber_count: "",
    video_count: "",
    total_view_count: "",
    primary_niche: "",
  });

  const handleAdd = () => {
    if (!form.channel_name.trim()) return;
    createCompetitor.mutate(
      {
        channel_name: form.channel_name,
        channel_url: form.channel_url || null,
        subscriber_count: form.subscriber_count ? Number(form.subscriber_count) : null,
        video_count: form.video_count ? Number(form.video_count) : null,
        total_view_count: form.total_view_count ? Number(form.total_view_count) : null,
        primary_niche: form.primary_niche || null,
      },
      {
        onSuccess: () => {
          setForm({ channel_name: "", channel_url: "", subscriber_count: "", video_count: "", total_view_count: "", primary_niche: "" });
          setShowAdd(false);
          toast.success("Competitor added");
        },
      }
    );
  };

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!benchmark) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Add competitor channels to see benchmarking data.</p>
        </div>
        <AddForm
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          form={form}
          setForm={setForm}
          handleAdd={handleAdd}
          isPending={createCompetitor.isPending}
        />
      </div>
    );
  }

  // Chart data for comparison
  const subChartData = [
    { name: "You", value: benchmark.comparisons.find((c) => c.metric === "Subscribers")?.yours ?? 0 },
    ...benchmark.competitors.slice(0, 5).map((c) => ({
      name: c.channel_name.length > 12 ? c.channel_name.substring(0, 12) + "…" : c.channel_name,
      value: c.subscriber_count ?? 0,
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Sync Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {benchmark.competitors[0]?.last_synced_at
            ? `Last synced: ${formatDistanceToNow(new Date(benchmark.competitors[0].last_synced_at), { addSuffix: true })}`
            : "Never synced"}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncCompetitors.mutate(undefined, { onSuccess: () => toast.success("Competitors synced!") })}
          disabled={syncCompetitors.isPending}
        >
          {syncCompetitors.isPending ? "Syncing..." : "Sync from YouTube"}
        </Button>
      </div>

      {/* Comparisons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {benchmark.comparisons.map((comp) => {
          const Icon = statusIcon[comp.status];
          return (
            <div key={comp.metric} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${statusColor[comp.status]}`} />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{comp.metric}</p>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{fmtCount(comp.yours)}</p>
              <p className="text-xs text-muted-foreground">
                vs avg {fmtCount(comp.competitorAvg)}
                <span className={`ml-1 ${statusColor[comp.status]}`}>
                  ({comp.deltaPercent >= 0 ? "+" : ""}{comp.deltaPercent.toFixed(0)}%)
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Position */}
      {benchmark.yourPosition.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Medal className="w-3.5 h-3.5 text-yellow-500" />
            Your Position
          </h3>
          <div className="flex items-center gap-6">
            {benchmark.yourPosition.map((p) => (
              <div key={p.metric} className="text-center">
                <p className="text-2xl font-bold font-mono text-foreground">#{p.rank}</p>
                <p className="text-xs text-muted-foreground">of {p.total} · {p.metric}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {benchmark.insights.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {benchmark.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <BarChart3 className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Subscriber Comparison Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Subscriber Comparison</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={subChartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis dataKey="name" {...xAxisDefaults} />
            <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtCount(v)} />
            <Bar dataKey="value" {...barDefaults} name="Subscribers" animationDuration={800}>
              {subChartData.map((entry, i) => (
                <Cell key={i} fill={i === 0 ? "#22c55e" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Competitor List */}
      <div className="space-y-2">
        {benchmark.competitors.map((comp) => (
          <div key={comp.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{comp.channel_name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {comp.subscriber_count != null && <span>{fmtCount(comp.subscriber_count)} subs</span>}
                {comp.video_count != null && <span>{comp.video_count} videos</span>}
                {comp.primary_niche && <span>{comp.primary_niche}</span>}
              </div>
            </div>
            {comp.channel_url && (
              <a href={comp.channel_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-blue-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              className="text-muted-foreground hover:text-red-500 transition-colors"
              onClick={() => deleteCompetitor.mutate(comp.id, { onSuccess: () => toast.success("Removed") })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Competitor */}
      <AddForm
        showAdd={showAdd}
        setShowAdd={setShowAdd}
        form={form}
        setForm={setForm}
        handleAdd={handleAdd}
        isPending={createCompetitor.isPending}
      />
    </div>
  );
}

function AddForm({ showAdd, setShowAdd, form, setForm, handleAdd, isPending }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {showAdd ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Channel name"
              value={form.channel_name}
              onChange={(e: any) => setForm({ ...form, channel_name: e.target.value })}
            />
            <Input
              placeholder="Channel URL"
              value={form.channel_url}
              onChange={(e: any) => setForm({ ...form, channel_url: e.target.value })}
            />
            <Input
              placeholder="Subscribers"
              type="number"
              value={form.subscriber_count}
              onChange={(e: any) => setForm({ ...form, subscriber_count: e.target.value })}
            />
            <Input
              placeholder="Niche"
              value={form.primary_niche}
              onChange={(e: any) => setForm({ ...form, primary_niche: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={isPending}>Add Competitor</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Competitor
        </Button>
      )}
    </div>
  );
}
