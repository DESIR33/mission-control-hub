import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { BarChart3, Brain, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { safeFormat, safeGetTime } from "@/lib/date-utils";
import { format, subDays, } from "date-fns";

const query = (table: string) => (supabase as any).from(table);

type Range = "7" | "30" | "90";

const AGENT_COLORS: Record<string, string> = {
  claude: "hsl(239, 84%, 67%)",
  chatgpt: "hsl(152, 60%, 42%)",
  gemini: "hsl(38, 92%, 50%)",
  global: "hsl(0, 0%, 45%)",
};

export default function MemoryAnalyticsPage() {
  const { workspaceId } = useWorkspace();
  const [range, setRange] = useState<Range>("30");
  const days = Number(range);
  const since = useMemo(() => subDays(new Date(), days).toISOString(), [days]);

  // --- Metric: Total active memories ---
  const { data: totalMemories = 0 } = useQuery({
    queryKey: ["mem-analytics-total", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count } = await query("assistant_memory")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active");
      return count ?? 0;
    },
  });

  // --- Metric: Avg confidence ---
  const { data: avgConfidence = 0 } = useQuery({
    queryKey: ["mem-analytics-conf", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("assistant_memory")
        .select("confidence_score")
        .eq("workspace_id", workspaceId)
        .eq("status", "active");
      if (!data?.length) return 0;
      const sum = data.reduce((a: number, m: any) => a + (m.confidence_score ?? 0), 0);
      return sum / data.length;
    },
  });

  // --- Metric: Pending conflicts ---
  const { data: pendingConflicts = 0 } = useQuery({
    queryKey: ["mem-analytics-conflicts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count } = await query("memory_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  // --- Metric: 7-day hit rate ---
  const { data: hitRate = 0 } = useQuery({
    queryKey: ["mem-analytics-hitrate", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const since7 = subDays(new Date(), 7).toISOString();
      const { data } = await query("memory_ratings")
        .select("rating")
        .eq("workspace_id", workspaceId)
        .gte("rated_at", since7);
      if (!data?.length) return 0;
      const ups = data.filter((r: any) => r.rating === "up").length;
      return (ups / data.length) * 100;
    },
  });

  // --- Chart: memories by agent ---
  const { data: agentCounts = [] } = useQuery({
    queryKey: ["mem-analytics-agents", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("assistant_memory")
        .select("agent_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active");
      if (!data) return [];
      const map: Record<string, number> = {};
      data.forEach((m: any) => { map[m.agent_id] = (map[m.agent_id] || 0) + 1; });
      return Object.entries(map).map(([agent, count]) => ({ agent, count }));
    },
  });

  // --- Chart: avg confidence per day (last N days) ---
  const { data: confTrend = [] } = useQuery({
    queryKey: ["mem-analytics-conf-trend", workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("assistant_memory")
        .select("confidence_score, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since);
      if (!data?.length) return [];
      const buckets: Record<string, { sum: number; count: number }> = {};
      data.forEach((m: any) => {
        const day = safeFormat(m.created_at, "MMM d");
        if (!buckets[day]) buckets[day] = { sum: 0, count: 0 };
        buckets[day].sum += m.confidence_score ?? 0;
        buckets[day].count += 1;
      });
      return Object.entries(buckets).map(([day, v]) => ({
        day,
        confidence: +(v.sum / v.count).toFixed(3),
      }));
    },
  });

  // --- Chart: decay histogram ---
  const { data: decayData = [] } = useQuery({
    queryKey: ["mem-analytics-decay", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("assistant_memory")
        .select("last_accessed_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "active");
      const bins = [
        { label: "0–7d", min: 0, max: 7, count: 0 },
        { label: "7–30d", min: 7, max: 30, count: 0 },
        { label: "30–90d", min: 30, max: 90, count: 0 },
        { label: "90d+", min: 90, max: Infinity, count: 0 },
      ];
      const now = Date.now();
      (data || []).forEach((m: any) => {
        const daysSince = m.last_accessed_at
          ? (now - safeGetTime(m.last_accessed_at)) / 86400000
          : 999;
        const bin = bins.find((b) => daysSince >= b.min && daysSince < b.max);
        if (bin) bin.count++;
      });
      return bins.map(({ label, count }) => ({ label, count }));
    },
  });

  // --- Chart: conflicts per day ---
  const { data: conflictTrend = [] } = useQuery({
    queryKey: ["mem-analytics-conflict-trend", workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("memory_conflicts")
        .select("detected_at")
        .eq("workspace_id", workspaceId)
        .gte("detected_at", since);
      if (!data?.length) return [];
      const buckets: Record<string, number> = {};
      data.forEach((c: any) => {
        const day = safeFormat(c.detected_at, "MMM d");
        buckets[day] = (buckets[day] || 0) + 1;
      });
      return Object.entries(buckets).map(([day, count]) => ({ day, count }));
    },
  });

  // --- Top 10 most retrieved ---
  const { data: topMemories = [] } = useQuery({
    queryKey: ["mem-analytics-top", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await query("assistant_memory")
        .select("id, content, confidence_score, agent_id, access_count")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("access_count", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const metricCards = [
    { label: "Total Memories", value: totalMemories.toLocaleString(), icon: Brain, color: "text-blue-400" },
    { label: "Avg Confidence", value: `${(avgConfidence * 100).toFixed(1)}%`, icon: Target, color: "text-teal-400" },
    { label: "Pending Conflicts", value: pendingConflicts.toLocaleString(), icon: AlertTriangle, color: pendingConflicts > 0 ? "text-amber-400" : "text-muted-foreground" },
    { label: "7d Hit Rate", value: `${hitRate.toFixed(1)}%`, icon: TrendingUp, color: "text-emerald-400" },
  ];

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: "hsl(0,0%,8%)", border: "1px solid hsl(0,0%,15%)", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "hsl(0,0%,64%)" },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Memory Analytics</h1>
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-0.5">
          {(["7", "30", "90"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card border-border/50">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Memories by Agent</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                <XAxis dataKey="agent" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {agentCounts.map((entry: any, idx: number) => (
                    <Cell key={idx} fill={AGENT_COLORS[entry.agent?.toLowerCase()] || "hsl(187,85%,43%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confidence Trend ({range}d)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={confTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="confidence" stroke="hsl(187,85%,43%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retrieval Decay Curve</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                <XAxis dataKey="label" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(239,84%,67%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflict Detection Rate ({range}d)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conflictTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,15%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0,0%,64%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top 10 Most Retrieved Memories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topMemories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No retrieval data yet.</p>
          )}
          {topMemories.map((m: any, i: number) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">#{i + 1}</span>
              <p className="text-sm font-mono text-foreground flex-1 truncate">{m.content}</p>
              <Badge variant="outline" className="text-[10px] shrink-0">{m.access_count ?? 0} hits</Badge>
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(m.confidence_score ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8">{((m.confidence_score ?? 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
