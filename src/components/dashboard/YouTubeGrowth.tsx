import { motion } from "framer-motion";
import { Youtube, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useYouTubeChannelStats } from "@/hooks/use-youtube-analytics";

const SUBSCRIBER_GOAL = 50_000;

export function YouTubeGrowth() {
  const { data: snapshots = [], isLoading } = useYouTubeChannelStats(30);

  const latest = snapshots[0] ?? null;
  const subscriberCount = latest?.subscriber_count ?? 0;
  const goalPercent = Math.min((subscriberCount / SUBSCRIBER_GOAL) * 100, 100);

  // Build trend data from snapshots (oldest → newest)
  const trend = [...snapshots].reverse();

  const maxSubs = Math.max(...trend.map((s) => s.subscriber_count), 1);

  const handleSync = () => {
    toast.info(
      "YouTube sync requires a backend worker. This button is a placeholder — connect a server-side function to pull data via the YouTube Data API v3."
    );
  };

  const fmtCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-card-foreground">
            YouTube Growth
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleSync}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Sync
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : trend.length === 0 ? (
        /* Empty state */
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            No YouTube data yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Connect the YouTube integration and sync to start tracking growth.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current subscribers */}
          <div className="text-center">
            <p className="text-3xl font-bold font-mono text-card-foreground">
              {fmtCount(subscriberCount)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">subscribers</p>
          </div>

          {/* Subscriber trend chart */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              Subscriber trend
            </p>
            <div className="flex items-end gap-[3px] h-20">
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

          {/* 50K goal progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Goal: {fmtCount(SUBSCRIBER_GOAL)} subscribers
              </p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {goalPercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={goalPercent} className="h-2" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
