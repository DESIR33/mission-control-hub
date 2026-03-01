import { useMemo, useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Eye, ThumbsUp, MessageSquare,
  Clock, Users, Play, Calendar, ArrowUpRight, ArrowDownRight,
  Zap, Award, Target, RefreshCw, ChevronDown,
} from "lucide-react";
import { useWorkspace, WorkspaceProvider } from "@/hooks/use-workspace";
import {
  useYouTubeChannelStats, useYouTubeVideoStats, useGrowthGoal, useSyncYouTube,
} from "@/hooks/use-youtube-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { format, differenceInDays, subDays, parseISO } from "date-fns";

type TimeRange = "7d" | "30d" | "90d";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtDuration = (seconds: number) => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds}s`;
};

function AnalyticsContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { isLoading: workspaceLoading } = useWorkspace();
  const { data: channelSnapshots = [], isLoading: loadingChannel } = useYouTubeChannelStats(90);
  const { data: videoStats = [], isLoading: loadingVideos } = useYouTubeVideoStats(50);
  const { data: goal } = useGrowthGoal();
  const syncYouTube = useSyncYouTube();

  const isLoading = workspaceLoading || loadingChannel || loadingVideos;

  const daysForRange = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  // Filter snapshots by time range
  const filteredSnapshots = useMemo(() => {
    const cutoff = subDays(new Date(), daysForRange);
    return channelSnapshots
      .filter((s) => new Date(s.fetched_at) >= cutoff)
      .slice()
      .sort((a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime());
  }, [channelSnapshots, daysForRange]);

  // Subscriber trend data for chart
  const subscriberTrend = useMemo(
    () =>
      filteredSnapshots.map((s) => ({
        date: format(new Date(s.fetched_at), "MMM d"),
        subscribers: s.subscriber_count,
        views: s.total_view_count,
        videos: s.video_count,
      })),
    [filteredSnapshots]
  );

  // Period-over-period subscriber growth
  const subGrowthMetrics = useMemo(() => {
    if (filteredSnapshots.length < 2) return null;
    const first = filteredSnapshots[0];
    const last = filteredSnapshots[filteredSnapshots.length - 1];
    const subsGained = last.subscriber_count - first.subscriber_count;
    const viewsGained = last.total_view_count - first.total_view_count;
    const videosPublished = last.video_count - first.video_count;
    const daysCovered = Math.max(
      differenceInDays(new Date(last.fetched_at), new Date(first.fetched_at)),
      1
    );
    const dailyGrowthRate = subsGained / daysCovered;
    const growthPercent = first.subscriber_count > 0
      ? ((subsGained / first.subscriber_count) * 100)
      : 0;

    // Projection: at current rate, when will goal be reached?
    const target = goal?.target_value ?? 50000;
    const remaining = target - last.subscriber_count;
    const daysToGoal = dailyGrowthRate > 0 ? Math.ceil(remaining / dailyGrowthRate) : null;

    return {
      subsGained,
      viewsGained,
      videosPublished,
      dailyGrowthRate,
      growthPercent,
      daysToGoal,
      currentSubs: last.subscriber_count,
      currentViews: last.total_view_count,
      currentVideos: last.video_count,
      subsPerVideo: videosPublished > 0 ? Math.round(subsGained / videosPublished) : null,
      viewsPerVideo: videosPublished > 0 ? Math.round(viewsGained / videosPublished) : null,
    };
  }, [filteredSnapshots, goal]);

  // Video engagement metrics
  const videoEngagement = useMemo(() => {
    if (videoStats.length === 0) return null;
    const totalViews = videoStats.reduce((sum, v) => sum + (v.views ?? 0), 0);
    const totalLikes = videoStats.reduce((sum, v) => sum + (v.likes ?? 0), 0);
    const totalComments = videoStats.reduce((sum, v) => sum + (v.comments ?? 0), 0);
    const totalWatchTime = videoStats.reduce((sum, v) => sum + (v.watch_time_minutes ?? 0), 0);
    const engagementRate = totalViews > 0
      ? (((totalLikes + totalComments) / totalViews) * 100)
      : 0;
    const likesToViewsRatio = totalViews > 0 ? ((totalLikes / totalViews) * 100) : 0;

    const durationsWithData = videoStats.filter((v) => v.avg_view_duration_seconds != null);
    const avgDuration = durationsWithData.length > 0
      ? Math.round(durationsWithData.reduce((sum, v) => sum + (v.avg_view_duration_seconds ?? 0), 0) / durationsWithData.length)
      : null;

    const ctrData = videoStats.filter((v) => v.ctr_percent != null);
    const avgCtr = ctrData.length > 0
      ? +(ctrData.reduce((sum, v) => sum + (v.ctr_percent ?? 0), 0) / ctrData.length).toFixed(1)
      : null;

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTime,
      engagementRate: +engagementRate.toFixed(2),
      likesToViewsRatio: +likesToViewsRatio.toFixed(2),
      avgDuration,
      avgCtr,
      videoCount: videoStats.length,
    };
  }, [videoStats]);

  // Sorted video table data with engagement score
  const sortedVideos = useMemo(
    () =>
      videoStats
        .slice()
        .map((v) => {
          const engRate = (v.views ?? 0) > 0
            ? (((v.likes ?? 0) + (v.comments ?? 0)) / (v.views ?? 1)) * 100
            : 0;
          return { ...v, engagementRate: +engRate.toFixed(2) };
        })
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0)),
    [videoStats]
  );

  // Top 5 performing videos by engagement score
  const topVideos = useMemo(() => {
    return sortedVideos
      .slice()
      .sort((a, b) => {
        // Composite score: normalized views + engagement rate + CTR
        const maxViews = Math.max(...sortedVideos.map((v) => v.views ?? 0), 1);
        const scoreA = ((a.views ?? 0) / maxViews) * 40 + (a.engagementRate ?? 0) * 3 + (a.ctr_percent ?? 0) * 2;
        const scoreB = ((b.views ?? 0) / maxViews) * 40 + (b.engagementRate ?? 0) * 3 + (b.ctr_percent ?? 0) * 2;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [sortedVideos]);

  // Scatter data: Views vs CTR
  const scatterData = useMemo(
    () =>
      videoStats
        .filter((v) => v.views != null && v.ctr_percent != null)
        .map((v) => ({
          title: v.title,
          views: v.views!,
          ctr: +(v.ctr_percent!).toFixed(1),
        })),
    [videoStats]
  );

  // Content format analysis
  const formatAnalysis = useMemo(() => {
    const patterns: Record<string, { label: string; regex: RegExp }> = {
      tutorial: { label: "Tutorials", regex: /tutorial|how to|guide|learn/i },
      review: { label: "Reviews", regex: /review|unbox|hands.on/i },
      vlog: { label: "Vlogs", regex: /vlog|day in|behind/i },
      shorts: { label: "Shorts", regex: /shorts|#short/i },
      other: { label: "Other", regex: /.*/ },
    };

    const groups: Record<string, { count: number; totalViews: number; totalLikes: number; totalComments: number; avgCtr: number; ctrCount: number; totalWatchTime: number }> = {};

    for (const video of videoStats) {
      let matched = false;
      for (const [key, { regex }] of Object.entries(patterns)) {
        if (key === "other") continue;
        if (regex.test(video.title ?? "")) {
          if (!groups[key]) groups[key] = { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, avgCtr: 0, ctrCount: 0, totalWatchTime: 0 };
          groups[key].count++;
          groups[key].totalViews += video.views ?? 0;
          groups[key].totalLikes += video.likes ?? 0;
          groups[key].totalComments += video.comments ?? 0;
          groups[key].totalWatchTime += video.watch_time_minutes ?? 0;
          if (video.ctr_percent != null) {
            groups[key].avgCtr += video.ctr_percent;
            groups[key].ctrCount++;
          }
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (!groups.other) groups.other = { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, avgCtr: 0, ctrCount: 0, totalWatchTime: 0 };
        groups.other.count++;
        groups.other.totalViews += video.views ?? 0;
        groups.other.totalLikes += video.likes ?? 0;
        groups.other.totalComments += video.comments ?? 0;
        groups.other.totalWatchTime += video.watch_time_minutes ?? 0;
        if (video.ctr_percent != null) {
          groups.other.avgCtr += video.ctr_percent;
          groups.other.ctrCount++;
        }
      }
    }

    return Object.entries(groups).map(([key, data]) => {
      const engRate = data.totalViews > 0
        ? +(((data.totalLikes + data.totalComments) / data.totalViews) * 100).toFixed(2)
        : 0;
      return {
        format: patterns[key]?.label ?? key,
        count: data.count,
        avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
        avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
        avgCtr: data.ctrCount > 0 ? +((data.avgCtr / data.ctrCount)).toFixed(1) : 0,
        engagementRate: engRate,
        totalWatchTime: data.totalWatchTime,
      };
    }).sort((a, b) => b.avgViews - a.avgViews);
  }, [videoStats]);

  // Publish frequency data (videos per week)
  const publishFrequency = useMemo(() => {
    const published = videoStats
      .filter((v) => v.published_at)
      .sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime());

    if (published.length < 2) return null;

    // Group by week
    const weeks: Record<string, number> = {};
    for (const v of published) {
      const date = new Date(v.published_at!);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = format(weekStart, "MMM d");
      weeks[key] = (weeks[key] ?? 0) + 1;
    }

    const entries = Object.entries(weeks).map(([week, count]) => ({ week, videos: count }));
    const avgPerWeek = published.length > 0
      ? +(published.length / Math.max(Object.keys(weeks).length, 1)).toFixed(1)
      : 0;

    // Average gap between publishes
    const gaps: number[] = [];
    for (let i = 1; i < published.length; i++) {
      gaps.push(differenceInDays(new Date(published[i].published_at!), new Date(published[i - 1].published_at!)));
    }
    const avgGap = gaps.length > 0 ? +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : null;

    return { entries, avgPerWeek, avgGap };
  }, [videoStats]);

  // Views trend (area chart showing views over time from video stats)
  const viewsTrend = useMemo(() => {
    return filteredSnapshots.map((s) => ({
      date: format(new Date(s.fetched_at), "MMM d"),
      views: s.total_view_count,
    }));
  }, [filteredSnapshots]);

  const latestSnapshot = channelSnapshots.length > 0
    ? channelSnapshots.reduce((a, b) => new Date(a.fetched_at) > new Date(b.fetched_at) ? a : b)
    : null;

  const handleSync = () => {
    syncYouTube.mutate(undefined, {
      onSuccess: () => toast.success("YouTube data synced successfully!"),
      onError: (err: Error) => toast.error(`Sync failed: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Subscriber growth, video performance, and content strategy insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncYouTube.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncYouTube.isPending ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Subscriber Growth KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Subscribers</p>
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {latestSnapshot ? latestSnapshot.subscriber_count.toLocaleString() : "--"}
          </p>
          {subGrowthMetrics && (
            <div className="flex items-center gap-1 mt-1">
              {subGrowthMetrics.subsGained >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-mono ${subGrowthMetrics.subsGained >= 0 ? "text-green-500" : "text-red-500"}`}>
                {subGrowthMetrics.subsGained >= 0 ? "+" : ""}{subGrowthMetrics.subsGained.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                ({subGrowthMetrics.growthPercent >= 0 ? "+" : ""}{subGrowthMetrics.growthPercent.toFixed(1)}%)
              </span>
            </div>
          )}
          {goal && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Goal: {goal.target_value.toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Views</p>
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {latestSnapshot ? fmtCount(latestSnapshot.total_view_count) : "--"}
          </p>
          {subGrowthMetrics && subGrowthMetrics.viewsGained > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-xs font-mono text-green-500">
                +{fmtCount(subGrowthMetrics.viewsGained)}
              </span>
              <span className="text-xs text-muted-foreground">in {daysForRange}d</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Growth</p>
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {subGrowthMetrics
              ? `+${Math.round(subGrowthMetrics.dailyGrowthRate)}/d`
              : "--"}
          </p>
          {subGrowthMetrics?.daysToGoal && (
            <p className="text-[10px] text-muted-foreground mt-1">
              ~{subGrowthMetrics.daysToGoal}d to goal at this rate
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Subs/Video</p>
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {subGrowthMetrics?.subsPerVideo != null ? `+${subGrowthMetrics.subsPerVideo}` : "--"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Growth velocity</p>
        </div>
      </div>

      {/* Goal Progress Bar */}
      {goal && latestSnapshot && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{goal.title}</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {latestSnapshot.subscriber_count.toLocaleString()} / {goal.target_value.toLocaleString()}
            </span>
          </div>
          <Progress
            value={Math.min((latestSnapshot.subscriber_count / goal.target_value) * 100, 100)}
            className="h-2.5"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground font-mono">
              {((latestSnapshot.subscriber_count / goal.target_value) * 100).toFixed(1)}% complete
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {(goal.target_value - latestSnapshot.subscriber_count).toLocaleString()} to go
            </span>
          </div>
        </div>
      )}

      {/* Charts Row: Subscriber Growth + Views Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscriber Growth Chart */}
        {subscriberTrend.length > 1 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Subscriber Growth</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={subscriberTrend}>
                <defs>
                  <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={fmtCount} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [value.toLocaleString(), "Subscribers"]}
                />
                <Area type="monotone" dataKey="subscribers" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#subGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Total Views Trend */}
        {viewsTrend.length > 1 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Total Views Over Time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={viewsTrend}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={fmtCount} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [value.toLocaleString(), "Total Views"]}
                />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Video Engagement KPI Cards */}
      {videoEngagement && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Video Engagement Metrics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated from {videoEngagement.videoCount} tracked videos
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Engagement Rate</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.engagementRate}%
              </p>
              <p className="text-[10px] text-muted-foreground">(likes+comments)/views</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg CTR</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.avgCtr != null ? `${videoEngagement.avgCtr}%` : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">click-through rate</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Duration</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.avgDuration != null ? fmtDuration(videoEngagement.avgDuration) : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">view duration</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Like Ratio</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.likesToViewsRatio}%
              </p>
              <p className="text-[10px] text-muted-foreground">likes/views</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Watch Time</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.totalWatchTime >= 60
                  ? `${Math.round(videoEngagement.totalWatchTime / 60)}h`
                  : `${videoEngagement.totalWatchTime}m`}
              </p>
              <p className="text-[10px] text-muted-foreground">across all videos</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Comments</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                {videoEngagement.totalComments.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">community signals</p>
            </div>
          </div>
        </>
      )}

      {/* Top Performing Videos */}
      {topVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-foreground">Top Performing Videos</h2>
          </div>
          <div className="space-y-3">
            {topVideos.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <span className="text-lg font-bold text-muted-foreground font-mono w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={v.title ?? ""}>
                    {v.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> {(v.views ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <ThumbsUp className="w-2.5 h-2.5" /> {(v.likes ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5" /> {(v.comments ?? 0).toLocaleString()}
                    </span>
                    {v.ctr_percent != null && (
                      <span className="text-[10px] text-muted-foreground">
                        CTR: {v.ctr_percent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-primary">{v.engagementRate}%</span>
                  <p className="text-[10px] text-muted-foreground">engagement</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Cadence + Performance Quadrant Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Publish Frequency */}
        {publishFrequency && publishFrequency.entries.length > 1 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Publish Cadence
              </h2>
              <div className="flex gap-3">
                <span className="text-[10px] text-muted-foreground">
                  Avg: <span className="font-mono font-semibold text-foreground">{publishFrequency.avgPerWeek}</span>/week
                </span>
                {publishFrequency.avgGap != null && (
                  <span className="text-[10px] text-muted-foreground">
                    Gap: <span className="font-mono font-semibold text-foreground">{publishFrequency.avgGap}</span> days
                  </span>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={publishFrequency.entries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [value, "Videos"]}
                />
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance Quadrant: Views vs CTR */}
        {scatterData.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-1">Performance Quadrant</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Views vs CTR — top-right = subscriber magnets
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="views" name="Views" tick={{ fontSize: 10 }} label={{ value: "Views", position: "insideBottom", offset: -5, fontSize: 10 }} />
                <YAxis dataKey="ctr" name="CTR %" tick={{ fontSize: 10 }} label={{ value: "CTR %", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [name === "views" ? value.toLocaleString() : `${value}%`, name === "views" ? "Views" : "CTR"]}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Content Format Analysis */}
      {formatAnalysis.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Content Format Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Format</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Videos</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Avg Views</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Avg Likes</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Avg CTR</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Eng. Rate</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Watch Time</th>
                </tr>
              </thead>
              <tbody>
                {formatAnalysis.map((row) => (
                  <tr key={row.format} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium text-foreground">{row.format}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{row.count}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{row.avgViews.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{row.avgLikes.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{row.avgCtr}%</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{row.engagementRate}%</td>
                    <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                      {row.totalWatchTime >= 60
                        ? `${Math.round(row.totalWatchTime / 60)}h`
                        : `${row.totalWatchTime}m`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Video Performance Table */}
      {sortedVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            All Videos ({sortedVideos.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Title</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                    <Eye className="inline h-3 w-3" /> Views
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                    <ThumbsUp className="inline h-3 w-3" /> Likes
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                    <MessageSquare className="inline h-3 w-3" /> Comments
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">CTR %</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Eng. %</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                    <Clock className="inline h-3 w-3" /> Watch Time
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Published</th>
                </tr>
              </thead>
              <tbody>
                {sortedVideos.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-2 text-foreground max-w-[250px] truncate" title={v.title ?? ""}>
                      {v.title}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {(v.views ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {(v.likes ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {(v.comments ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {v.ctr_percent != null ? `${v.ctr_percent.toFixed(1)}%` : "--"}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {v.engagementRate}%
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                      {v.watch_time_minutes != null
                        ? v.watch_time_minutes >= 60
                          ? `${Math.floor(v.watch_time_minutes / 60)}h ${v.watch_time_minutes % 60}m`
                          : `${v.watch_time_minutes}m`
                        : "--"}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {v.published_at ? format(new Date(v.published_at), "MMM d") : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content-to-Subscriber Correlation (Feature 12) */}
      {videoStats.length > 0 && channelSnapshots.length > 1 && (() => {
        const sortedSnapshots = channelSnapshots
          .slice()
          .sort((a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime());

        // Sort videos by publish date for non-overlapping attribution windows
        const publishedVideos = videoStats
          .filter((v) => v.published_at)
          .slice()
          .sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime());

        // Group videos published on the same day to split their delta equally
        const videoGroups: { date: Date; dateKey: string; videos: typeof publishedVideos }[] = [];
        for (const video of publishedVideos) {
          const pubDate = new Date(video.published_at!);
          const dateKey = format(pubDate, "yyyy-MM-dd");
          const lastGroup = videoGroups[videoGroups.length - 1];
          if (lastGroup && lastGroup.dateKey === dateKey) {
            lastGroup.videos.push(video);
          } else {
            videoGroups.push({ date: pubDate, dateKey, videos: [video] });
          }
        }

        const subscriberImpact: Array<{
          title: string;
          published_at: string | null;
          views: number;
          ctr: number | null;
          engagementRate: number;
          subscriberDelta: number;
        }> = [];

        for (let i = 0; i < videoGroups.length; i++) {
          const group = videoGroups[i];
          const pubDate = group.date;
          const sevenDaysAfter = new Date(pubDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Cap window at next group's publish date to prevent overlapping attribution
          const nextGroupDate = i < videoGroups.length - 1 ? videoGroups[i + 1].date : null;
          const windowEnd = nextGroupDate && nextGroupDate < sevenDaysAfter
            ? nextGroupDate
            : sevenDaysAfter;

          // Find closest snapshot on or before publish date
          const snapshotsBefore = sortedSnapshots.filter((s) => new Date(s.fetched_at) <= pubDate);
          const snapshotBefore = snapshotsBefore.length > 0 ? snapshotsBefore[snapshotsBefore.length - 1] : null;

          // Find closest snapshot to end of attribution window
          const snapshotsInWindow = sortedSnapshots.filter(
            (s) => new Date(s.fetched_at) > pubDate && new Date(s.fetched_at) <= windowEnd
          );
          const snapshotAfter = snapshotsInWindow.length > 0 ? snapshotsInWindow[snapshotsInWindow.length - 1] : null;

          // Only calculate delta when we have snapshots on both sides
          const totalDelta = snapshotBefore && snapshotAfter
            ? snapshotAfter.subscriber_count - snapshotBefore.subscriber_count
            : 0;
          const perVideoDelta = group.videos.length > 0
            ? Math.round(totalDelta / group.videos.length)
            : 0;

          for (const video of group.videos) {
            subscriberImpact.push({
              title: video.title,
              published_at: video.published_at,
              views: video.views ?? 0,
              ctr: video.ctr_percent,
              engagementRate:
                (video.views ?? 0) > 0
                  ? +((((video.likes ?? 0) + (video.comments ?? 0)) / (video.views ?? 1)) * 100).toFixed(2)
                  : 0,
              subscriberDelta: perVideoDelta,
            });
          }
        }

        subscriberImpact.sort((a, b) => b.subscriberDelta - a.subscriberDelta);

        const bestFormat = (() => {
          const patterns: Record<string, { regex: RegExp; label: string }> = {
            tutorial: { regex: /tutorial|how to|guide|learn/i, label: "Tutorials" },
            review: { regex: /review|unbox|hands.on/i, label: "Reviews" },
            vlog: { regex: /vlog|day in|behind/i, label: "Vlogs" },
          };
          const groups: Record<string, { totalDelta: number; count: number }> = {};
          for (const v of subscriberImpact) {
            let matched = false;
            for (const [key, { regex }] of Object.entries(patterns)) {
              if (regex.test(v.title ?? "")) {
                if (!groups[key]) groups[key] = { totalDelta: 0, count: 0 };
                groups[key].totalDelta += v.subscriberDelta;
                groups[key].count++;
                matched = true;
                break;
              }
            }
            if (!matched) {
              if (!groups.other) groups.other = { totalDelta: 0, count: 0 };
              groups.other.totalDelta += v.subscriberDelta;
              groups.other.count++;
            }
          }
          let best = { key: "", avg: 0 };
          for (const [key, data] of Object.entries(groups)) {
            const avg = data.count > 0 ? data.totalDelta / data.count : 0;
            if (avg > best.avg) best = { key, avg };
          }
          return best.key ? `${patterns[best.key]?.label ?? "Other"} (+${Math.round(best.avg)} subs/video avg)` : null;
        })();

        if (subscriberImpact.length === 0) return null;

        return (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Subscriber Impact by Video
              </h2>
              {bestFormat && (
                <span className="text-xs text-muted-foreground">
                  Best format: <span className="font-semibold text-foreground">{bestFormat}</span>
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subscriberImpact.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="title" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`+${value}`, "Subscriber Delta"]}
                />
                <Bar dataKey="subscriberDelta" radius={[4, 4, 0, 0]}>
                  {subscriberImpact.slice(0, 15).map((entry, index) => (
                    <Cell key={index} fill={entry.subscriberDelta >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Video</th>
                    <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Views</th>
                    <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Sub Delta</th>
                    <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">CTR</th>
                    <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Eng %</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriberImpact.slice(0, 10).map((v, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground max-w-[200px] truncate">{v.title}</td>
                      <td className="py-2 px-2 text-right font-mono">{v.views.toLocaleString()}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold ${v.subscriberDelta >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {v.subscriberDelta >= 0 ? "+" : ""}{v.subscriberDelta}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{v.ctr != null ? `${v.ctr.toFixed(1)}%` : "--"}</td>
                      <td className="py-2 px-2 text-right font-mono">{v.engagementRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {videoStats.length === 0 && channelSnapshots.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No analytics data yet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your YouTube account and sync data from the Integrations page.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <WorkspaceProvider>
      <AnalyticsContent />
    </WorkspaceProvider>
  );
}
