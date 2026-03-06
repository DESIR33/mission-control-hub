import { useMemo } from "react";
import { Users, Eye, DollarSign, Handshake, Video, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useChannelStats, useYouTubeChannelStats } from "@/hooks/use-youtube-analytics";
import { useDeals } from "@/hooks/use-deals";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";

function MicroSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48, h = 16;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block ml-1">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
    </svg>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${isPositive ? "text-green-500" : "text-red-500"}`}>
      <Icon className="w-2.5 h-2.5" />
      {isPositive ? "+" : ""}
      {formatCompact(delta)}
    </span>
  );
}

export function ChannelPulse() {
  const { data: channelStats } = useChannelStats();
  const { data: snapshots } = useYouTubeChannelStats(7);
  const { data: deals } = useDeals();
  const { data: videoQueue } = useVideoQueue();
  const { data: revenue } = useUnifiedRevenue();

  const subscriberDelta = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return 0;
    return snapshots[0].subscriber_count - snapshots[1].subscriber_count;
  }, [snapshots]);

  const sparklineData = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return [];
    return [...snapshots].reverse().map((s) => s.subscriber_count);
  }, [snapshots]);

  const activeDeals = useMemo(() => {
    if (!deals) return 0;
    return deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost").length;
  }, [deals]);

  const contentQueue = useMemo(() => {
    if (!videoQueue) return 0;
    return videoQueue.filter((v) => v.status !== "published").length;
  }, [videoQueue]);

  const currentMonthRevenue = useMemo(() => {
    if (!revenue?.monthly || revenue.monthly.length === 0) return 0;
    return revenue.monthly[revenue.monthly.length - 1].total;
  }, [revenue]);

  const lastSynced = channelStats?.fetched_at
    ? format(new Date(channelStats.fetched_at), "MMM d, h:mm a")
    : null;

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/50 border-b overflow-x-auto max-h-12">
      {/* Subscribers */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground">Subscribers</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold font-mono">
              {channelStats ? formatCompact(channelStats.subscriber_count) : "--"}
            </span>
            <DeltaBadge delta={subscriberDelta} />
            <MicroSparkline data={sparklineData} />
          </div>
        </div>
      </div>

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Views */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground">Views</span>
          <span className="text-xs font-bold font-mono">
            {channelStats ? formatCompact(channelStats.total_view_count) : "--"}
          </span>
        </div>
      </div>

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Revenue */}
      <div className="flex items-center gap-1.5 shrink-0">
        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground">Revenue</span>
          <span className="text-xs font-bold font-mono">
            {revenue ? formatCurrency(currentMonthRevenue) : "--"}
          </span>
        </div>
      </div>

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Active Deals */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Handshake className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground">Active Deals</span>
          <span className="text-xs font-bold font-mono">{deals ? activeDeals : "--"}</span>
        </div>
      </div>

      <div className="w-px h-6 bg-border shrink-0" />

      {/* Content Queue */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Video className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground">Content Queue</span>
          <span className="text-xs font-bold font-mono">{videoQueue ? contentQueue : "--"}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Last Synced */}
      {lastSynced && (
        <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Synced {lastSynced}</span>
        </div>
      )}
    </div>
  );
}
