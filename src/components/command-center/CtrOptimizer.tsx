import { useState } from "react";
import {
  MousePointerClick, TrendingUp, Eye, AlertTriangle,
  ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useCtrOptimizer } from "@/hooks/use-ctr-optimizer";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const tierColor: Record<string, string> = {
  top: "text-yellow-400",
  above_avg: "text-green-400",
  average: "text-blue-400",
  below_avg: "text-orange-400",
  poor: "text-red-400",
};

export function CtrOptimizer() {
  const { data: optimization, isLoading } = useCtrOptimizer();
  const [showPatterns, setShowPatterns] = useState(false);

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!optimization) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <MousePointerClick className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No CTR data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointerClick className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg CTR</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.avgCtr.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">YouTube avg 4-5%</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top CTR Videos</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.topCtrVideos.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Low CTR</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.lowCtrVideos.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Missed Views</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(optimization.totalMissedViews)}</p>
          <p className="text-[10px] text-muted-foreground">recoverable</p>
        </div>
      </div>

      {/* Insights */}
      {optimization.insights.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {optimization.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTR Distribution */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">CTR Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={optimization.ctrDistribution}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Videos" radius={[4, 4, 0, 0]}>
              {optimization.ctrDistribution.map((_, i) => (
                <Cell key={i} fill={["#ef4444", "#eab308", "#3b82f6", "#22c55e", "#22c55e", "#22c55e"][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Title Patterns */}
      {optimization.titlePatterns.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowPatterns(!showPatterns)}
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              Title Patterns Analysis
            </h3>
            {showPatterns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showPatterns && (
            <div className="mt-3 space-y-2">
              {optimization.titlePatterns.map((p) => (
                <div key={p.pattern} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <p className="text-sm text-foreground">{p.pattern}</p>
                    <p className="text-[10px] text-muted-foreground">{p.videoCount} videos</p>
                  </div>
                  <Badge variant={p.avgCtr > optimization.avgCtr ? "default" : "secondary"}>
                    {p.avgCtr.toFixed(1)}% CTR
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top & Low CTR Videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            Best CTR Videos
          </h3>
          <div className="space-y-2">
            {optimization.topCtrVideos.slice(0, 5).map((v) => (
              <div key={v.videoId} className="flex items-center gap-2">
                <Badge className="text-[9px] shrink-0 font-mono">{v.ctr.toFixed(1)}%</Badge>
                <p className="text-xs text-foreground truncate flex-1">{v.title}</p>
                <p className="text-[10px] text-muted-foreground shrink-0">{fmtCount(v.views)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Low CTR (Opportunity)
          </h3>
          <div className="space-y-2">
            {optimization.lowCtrVideos.slice(0, 5).map((v) => (
              <div key={v.videoId} className="flex items-center gap-2">
                <Badge variant="destructive" className="text-[9px] shrink-0 font-mono">{v.ctr.toFixed(1)}%</Badge>
                <p className="text-xs text-foreground truncate flex-1">{v.title}</p>
                <p className="text-[10px] text-muted-foreground shrink-0">+{fmtCount(v.opportunity)} potential</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
