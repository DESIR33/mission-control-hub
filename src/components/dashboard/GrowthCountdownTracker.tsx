import { motion } from "framer-motion";
import { Target, TrendingUp, TrendingDown, Minus, Calendar, Zap } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useGrowthCountdown } from "@/hooks/use-growth-countdown";
import { fmtCount, chartTooltipStyle, SEMANTIC_COLORS } from "@/lib/chart-theme";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { safeFormat } from "@/lib/date-utils";

const paceConfig = {
  ahead: {
    label: "Ahead of pace",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    badgeCls: "bg-green-500/15 text-green-400 border-green-500/30",
    Icon: TrendingUp,
  },
  "on-track": {
    label: "On track",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    badgeCls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    Icon: Minus,
  },
  behind: {
    label: "Behind pace",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    badgeCls: "bg-red-500/15 text-red-400 border-red-500/30",
    Icon: TrendingDown,
  },
};

export function GrowthCountdownTracker() {
  const { data, isLoading } = useGrowthCountdown();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-12 w-32 bg-muted rounded mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const pace = paceConfig[data.paceStatus];
  const PaceIcon = pace.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-xl border ${pace.border} bg-card/80 backdrop-blur-sm p-5 sm:p-6`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-card-foreground">
            50K Growth Countdown
          </h3>
        </div>
        <Badge variant="outline" className={`text-xs ${pace.badgeCls}`}>
          <PaceIcon className="w-3 h-3 mr-1" />
          {pace.label}
        </Badge>
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {/* Current subscribers */}
        <div className="min-w-0">
          <p className="text-2xl sm:text-4xl font-bold font-mono text-foreground tracking-tight truncate">
            {fmtCount(data.currentSubs)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">subscribers</p>
        </div>

        {/* Subscribers to go */}
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground truncate">
            {fmtCount(data.subsToGo)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">to go</p>
        </div>

        {/* Daily growth rate */}
        <div className="min-w-0">
          <p className={`text-base sm:text-lg font-bold font-mono truncate ${pace.color}`}>
            +{Math.round(data.dailyGrowthRate)}/day
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.requiredDailyRate != null
              ? `need +${Math.round(data.requiredDailyRate)}/day`
              : "current pace"}
          </p>
        </div>

        {/* Projected date / days remaining */}
        <div>
          {data.daysRemaining != null && data.projectedDate ? (
            <>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {format(data.projectedDate, "MMM yyyy")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ~{data.daysRemaining} days remaining
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">--</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                no growth data
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {data.progressPercent.toFixed(1)}% to {fmtCount(data.targetSubs)}
          </span>
          {data.targetDate && (
            <span className="text-xs text-muted-foreground">
              Target: {safeFormat(data.targetDate, "MMM d, yyyy")}
            </span>
          )}
        </div>
        <Progress value={data.progressPercent} className="h-2" />
      </div>

      {/* Sparkline */}
      {data.sparklineData.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-2">
            Daily subscriber gains (last 30 days)
          </p>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sparklineData}>
                <defs>
                  <linearGradient id="growthSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEMANTIC_COLORS.subscribers} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SEMANTIC_COLORS.subscribers} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number) => [`+${value} subs`, "Gained"]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="gained"
                  stroke={SEMANTIC_COLORS.subscribers}
                  strokeWidth={2}
                  fill="url(#growthSparkGrad)"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  );
}
