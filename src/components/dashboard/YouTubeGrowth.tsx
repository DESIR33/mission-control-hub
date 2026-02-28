import { motion } from "framer-motion";
import { Youtube, TrendingUp, Target, Calendar } from "lucide-react";
import { useGrowthGoal, useChannelStats } from "@/hooks/use-youtube-analytics";
import { differenceInDays, format, addMonths } from "date-fns";

export function YouTubeGrowth() {
  const { data: goal } = useGrowthGoal();
  const { data: channelStats } = useChannelStats();

  // Use goal data or fallback defaults for the 21K → 50K journey
  const currentValue = goal?.current_value ?? channelStats?.subscriber_count ?? 21000;
  const targetValue = goal?.target_value ?? 50000;
  const targetDate = goal?.target_date ?? format(addMonths(new Date(), 10), "yyyy-MM-dd");
  const startDate = goal?.start_date ?? format(new Date(), "yyyy-MM-dd");

  const progress = Math.min((currentValue / targetValue) * 100, 100);
  const remaining = targetValue - currentValue;
  const daysLeft = Math.max(differenceInDays(new Date(targetDate), new Date()), 0);
  const totalDays = Math.max(differenceInDays(new Date(targetDate), new Date(startDate)), 1);
  const dailyRate = remaining > 0 && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;

  // Milestones
  const milestones = [25000, 30000, 35000, 40000, 45000, 50000];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-red-500/10">
          <Youtube className="w-4 h-4 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">
          Subscriber Growth
        </h3>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Target className="w-3 h-3" />
          {targetValue.toLocaleString()} goal
        </div>
      </div>

      {/* Current count + progress */}
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold font-mono text-foreground">
          {currentValue.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground mb-1">subscribers</span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground font-mono">
            {progress.toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {remaining.toLocaleString()} to go
          </span>
        </div>
      </div>

      {/* Milestones */}
      <div className="relative h-6 mb-4">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        {milestones.map((m) => {
          const pos = ((m - 20000) / (targetValue - 20000)) * 100;
          const achieved = currentValue >= m;
          return (
            <div
              key={m}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${Math.min(pos, 100)}%` }}
              title={`${(m / 1000).toFixed(0)}K`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full border-2 ${
                  achieved
                    ? "bg-red-500 border-red-500"
                    : "bg-card border-border"
                }`}
              />
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
                {(m / 1000).toFixed(0)}K
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-3 border-t border-border">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <Calendar className="w-3 h-3" />
            Days Left
          </div>
          <p className="text-sm font-mono font-semibold text-card-foreground">
            {daysLeft}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <TrendingUp className="w-3 h-3" />
            Daily Target
          </div>
          <p className="text-sm font-mono font-semibold text-card-foreground">
            +{dailyRate}/day
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <Target className="w-3 h-3" />
            Target Date
          </div>
          <p className="text-sm font-mono font-semibold text-card-foreground">
            {format(new Date(targetDate), "MMM yyyy")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
