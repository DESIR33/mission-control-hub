import { motion } from "framer-motion";
import { Youtube, TrendingUp, Target, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useGrowthGoal,
  useChannelStats,
  useYouTubeChannelStats,
} from "@/hooks/use-youtube-analytics";
import { useDatasetSyncStatus, useManualDatasetRefresh } from "@/hooks/use-dataset-sync-status";
import { DataFreshnessBadge } from "@/components/ui/DataFreshnessBadge";
import { safeFormat } from "@/lib/date-utils";
import { differenceInDays, format, addMonths } from "date-fns";

const SUBSCRIBER_GOAL = 50_000;

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export function YouTubeGrowth() {
  const { data: goal } = useGrowthGoal();
  const { data: channelStats } = useChannelStats();
  const { data: snapshots = [], isLoading } = useYouTubeChannelStats(30);

  const { getStatus, canRefreshNow } = useDatasetSyncStatus(["youtubeVideoStats"]);
  const manualRefresh = useManualDatasetRefresh();
  const syncStatus = getStatus("youtubeVideoStats");
  const canRefresh = canRefreshNow("youtubeVideoStats");

  // Use goal data → latest snapshot → fallback 21K
  const currentValue = goal?.current_value ?? channelStats?.subscriber_count ?? 21000;
  const targetValue = goal?.target_value ?? SUBSCRIBER_GOAL;
  const targetDate = goal?.target_date ?? format(addMonths(new Date(), 10), "yyyy-MM-dd");
  const startDate = goal?.start_date ?? safeFormat(new Date(), "yyyy-MM-dd");

  const progress = Math.min((currentValue / targetValue) * 100, 100);
  const remaining = targetValue - currentValue;
  const daysLeft = Math.max(differenceInDays(new Date(targetDate), new Date()), 0);
  const dailyRate = remaining > 0 && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;

  const milestones = [25000, 30000, 35000, 40000, 45000, 50000];

  // Trend data (oldest → newest)
  const trend = [...snapshots].reverse();
  const maxSubs = Math.max(...trend.map((s) => s.subscriber_count), 1);

  const handleSync = () => {
    manualRefresh.mutate(
      { datasetKey: "youtubeVideoStats", edgeFunctionName: "youtube-sync" },
      {
        onSuccess: () => toast.success("YouTube data synced successfully!"),
        onError: (err) => toast.error(`Sync failed: ${err.message}`),
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-red-500/10">
          <Youtube className="w-4 h-4 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">
          Subscriber Growth
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="w-3 h-3" />
            {targetValue.toLocaleString()} goal
          </span>
          <DataFreshnessBadge
            status={syncStatus}
            cadenceLabel="Updated via webhook"
            canRefresh={canRefresh}
            onRefresh={handleSync}
            isRefreshing={manualRefresh.isPending}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Current count + progress */}
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-foreground">
              {currentValue.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground mb-1">subscribers</span>
          </div>

          {/* Progress bar */}
          <div className="relative mb-2">
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {progress.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground font-mono">
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
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                    {(m / 1000).toFixed(0)}K
                  </span>
                </div>
              );
            })}
          </div>

          {/* Subscriber trend chart */}
          {trend.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                Subscriber trend
              </p>
              <div className="flex items-end gap-[3px] h-16">
                {trend.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ height: 0 }}
                    animate={{
                      height: `${(s.subscriber_count / maxSubs) * 100}%`,
                    }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.02 }}
                    className="flex-1 rounded-t-sm bg-red-500/80 hover:bg-red-500 transition-colors min-h-[3px]"
                    title={`${fmtCount(s.subscriber_count)} subs — ${new Date(s.fetched_at).toLocaleDateString()}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                <Calendar className="w-3 h-3" />
                Days Left
              </div>
              <p className="text-sm font-mono font-semibold text-card-foreground">
                {daysLeft}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                <TrendingUp className="w-3 h-3" />
                Daily Target
              </div>
              <p className="text-sm font-mono font-semibold text-card-foreground">
                +{dailyRate}/day
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                <Target className="w-3 h-3" />
                Target Date
              </div>
              <p className="text-sm font-mono font-semibold text-card-foreground">
                {safeFormat(targetDate, "MMM yyyy")}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
