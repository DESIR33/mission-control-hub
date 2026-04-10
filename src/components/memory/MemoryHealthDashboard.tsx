import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Brain, AlertTriangle, Target, TrendingUp, Activity, Database,
  Pin, Layers, Search, Loader2, RefreshCw, ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  workspaceId: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "hsl(152, 60%, 42%)",
  stale: "hsl(38, 92%, 50%)",
  archived: "hsl(0, 0%, 45%)",
  expired: "hsl(0, 72%, 51%)",
};

const TYPE_COLORS: Record<string, string> = {
  semantic: "hsl(217, 91%, 60%)",
  episodic: "hsl(38, 92%, 50%)",
  preference: "hsl(270, 70%, 60%)",
  procedural: "hsl(152, 60%, 42%)",
  contextual: "hsl(350, 70%, 60%)",
};

const FRESHNESS_COLORS = [
  "hsl(152, 60%, 42%)",
  "hsl(187, 85%, 43%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(0,0%,8%)",
    border: "1px solid hsl(0,0%,15%)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(0,0%,64%)" },
};

export default function MemoryHealthDashboard({ workspaceId }: Props) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["memory-health-stats", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("memory-health-stats", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statusData = Object.entries(data.status_breakdown || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const typeData = Object.entries(data.type_breakdown || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const entityData = Object.entries(data.entity_coverage || {}).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  const freshnessData = [
    { label: "< 7d", count: data.freshness_distribution?.week || 0 },
    { label: "7–30d", count: data.freshness_distribution?.month || 0 },
    { label: "30–90d", count: data.freshness_distribution?.quarter || 0 },
    { label: "90d+", count: data.freshness_distribution?.older || 0 },
  ];

  const sourceData = Object.entries(data.source_breakdown || {}).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  const metricCards = [
    { label: "Total Memories", value: data.total_memories?.toLocaleString(), icon: Database, color: "text-blue-400" },
    { label: "Avg Confidence", value: `${(data.avg_confidence * 100).toFixed(1)}%`, icon: Target, color: "text-teal-400" },
    { label: "Decay Alerts", value: data.decay_alert_count?.toLocaleString(), icon: AlertTriangle, color: data.decay_alert_count > 0 ? "text-amber-400" : "text-muted-foreground" },
    { label: "Pinned", value: data.pinned_count?.toLocaleString(), icon: Pin, color: "text-purple-400" },
    { label: "Avg Retrievals", value: data.avg_access_count?.toFixed(1), icon: Search, color: "text-emerald-400" },
    { label: "Never Accessed", value: data.least_accessed?.toLocaleString(), icon: Activity, color: data.least_accessed > 5 ? "text-red-400" : "text-muted-foreground" },
    { label: "Near Duplicates", value: data.near_duplicate_count?.toLocaleString(), icon: Layers, color: "text-orange-400" },
    { label: "Pending Conflicts", value: (data.conflict_breakdown?.pending || 0).toLocaleString(), icon: ShieldAlert, color: (data.conflict_breakdown?.pending || 0) > 0 ? "text-red-400" : "text-muted-foreground" },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Memory Health Dashboard
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metricCards.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border/30 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{m.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status pie */}
          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">By Status</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} strokeWidth={1} stroke="hsl(0,0%,10%)">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || "hsl(0,0%,35%)"} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] || "hsl(0,0%,35%)" }} />
                  <span className="text-muted-foreground capitalize">{s.name}</span>
                  <span className="font-mono text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Type pie */}
          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">By Type</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} strokeWidth={1} stroke="hsl(0,0%,10%)">
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={TYPE_COLORS[entry.name] || "hsl(0,0%,35%)"} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {typeData.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[s.name] || "hsl(0,0%,35%)" }} />
                  <span className="text-muted-foreground capitalize">{s.name}</span>
                  <span className="font-mono text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Freshness bar */}
          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Freshness Distribution</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freshnessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {freshnessData.map((_, i) => (
                      <Cell key={i} fill={FRESHNESS_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Entity coverage & source breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Entity Coverage</p>
            {entityData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No entity-linked memories</p>
            ) : (
              <div className="space-y-2">
                {entityData.sort((a, b) => b.count - a.count).map(e => (
                  <div key={e.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground capitalize w-20 shrink-0">{e.name}</span>
                    <Progress value={Math.min((e.count / (data.total_memories || 1)) * 100, 100)} className="h-2 flex-1" />
                    <span className="text-xs font-mono text-foreground w-8 text-right">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">By Source</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                  <XAxis type="number" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(0,0%,64%)", fontSize: 10 }} width={80} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top tags & decay alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Top Tags</p>
            {data.top_tags?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tags found</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(data.top_tags || []).map((t: any) => (
                  <Badge key={t.tag} variant="secondary" className="text-xs gap-1">
                    {t.tag}
                    <span className="text-muted-foreground">({t.count})</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Decay Alerts ({data.decay_alert_count || 0})
            </p>
            {data.decay_alerts?.length === 0 ? (
              <p className="text-sm text-emerald-400 text-center py-4">All memories healthy ✓</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(data.decay_alerts || []).slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {a.reason === "stale" ? "Stale" : a.reason === "low_confidence" ? "Low Conf" : "Both"}
                    </Badge>
                    <span className="text-muted-foreground truncate font-mono">{a.id.slice(0, 8)}...</span>
                    {a.days_since_access !== null && (
                      <span className="text-muted-foreground ml-auto shrink-0">{a.days_since_access}d ago</span>
                    )}
                    <span className="text-muted-foreground shrink-0">{((a.confidence_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
