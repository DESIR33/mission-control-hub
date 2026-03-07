import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Trophy,
  Users,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCollabImpact, type CollabImpact } from "@/hooks/use-collab-impact";
import type { Collaboration } from "@/hooks/use-collaborations";

const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

function formatSubCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatSubGain(val: number): string {
  const prefix = val >= 0 ? "+" : "";
  if (Math.abs(val) >= 1_000) return `${prefix}${(val / 1_000).toFixed(1)}K`;
  return `${prefix}${val.toLocaleString()}`;
}

interface CollabImpactTrackerProps {
  collaborations: Collaboration[];
}

export function CollabImpactTracker({ collaborations }: CollabImpactTrackerProps) {
  const { impactData, aggregates } = useCollabImpact(collaborations);

  if (impactData.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Collaboration Impact Tracker
        </h2>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Subs from Collabs
            </p>
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {formatSubGain(aggregates.totalSubsGained)}
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Avg Gain per Collab
            </p>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatSubGain(aggregates.avgGainPerCollab)}
          </p>
        </div>

        {aggregates.bestCollab && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Best Collab
              </p>
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {aggregates.bestCollab.creatorName}
            </p>
            <p className="text-xs text-emerald-400">
              {formatSubGain(aggregates.bestCollab.subscriberLift)}
            </p>
          </div>
        )}
      </div>

      {/* Per-Collab Breakdown */}
      <div className="space-y-3">
        {impactData.map((impact) => (
          <CollabImpactRow key={impact.collabId} impact={impact} />
        ))}
      </div>
    </motion.div>
  );
}

function CollabImpactRow({ impact }: { impact: CollabImpact }) {
  const liftColor = impact.subscriberLift >= 0
    ? "text-emerald-400"
    : "text-red-400";

  const liftBadgeColor = impact.subscriberLift >= 0
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">{impact.creatorName}</h4>
          <Badge variant="outline" className={`text-xs ${liftBadgeColor}`}>
            {formatSubGain(impact.subscriberLift)} subs
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Published: {new Date(impact.publishDate).toLocaleDateString()}
        </span>
      </div>

      {/* Sub counts: before / day of / after */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">7 Days Before</p>
          <p className="text-sm font-mono font-bold text-foreground">
            {formatSubCount(impact.subsBefore)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Day Of</p>
          <p className="text-sm font-mono font-bold text-foreground">
            {formatSubCount(impact.subsOnDay)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">7 Days After</p>
          <p className={`text-sm font-mono font-bold ${liftColor}`}>
            {formatSubCount(impact.subsAfter)}
          </p>
        </div>
      </div>

      {/* Mini sparkline */}
      {impact.dailyData.length > 2 && (
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={impact.dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [formatSubCount(v), "Subscribers"]}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="subscribers"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
