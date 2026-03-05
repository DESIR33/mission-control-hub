import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, TrendingDown, Eye, ThumbsUp, MessageSquare,
  Clock, Users, Play, Calendar, ArrowUpRight, ArrowDownRight,
  Zap, Award, Target, RefreshCw, ChevronDown, ChevronUp, ArrowUpDown,
  Globe, Route, Monitor, DollarSign, Tv, ExternalLink,
} from "lucide-react";
import { useWorkspace, WorkspaceProvider } from "@/hooks/use-workspace";
import {
  useYouTubeChannelStats, useYouTubeVideoStats, useGrowthGoal, useSyncYouTube,
} from "@/hooks/use-youtube-analytics";
import {
  useChannelAnalytics, useVideoAnalytics, useDemographics,
  useTrafficSources, useGeography, useDeviceTypes, useSyncYouTubeAnalytics,
} from "@/hooks/use-youtube-analytics-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { format, differenceInDays, subDays, parseISO } from "date-fns";
import {
  ChannelOverview, AudienceDemographics, TrafficSources,
  GeographyBreakdown, DeviceBreakdown, VideoDeepDive, RevenueAnalytics,
  SyncStatusBar, SubscriberFunnel,
} from "@/components/analytics";

type TimeRange = "7d" | "30d" | "90d";
type AnalyticsTab = "overview" | "channel" | "videos" | "audience" | "traffic" | "geography" | "devices" | "revenue" | "growth_funnel";

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

const TABS: { key: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { key: "channel", label: "Channel", icon: <Tv className="w-3.5 h-3.5" /> },
  { key: "videos", label: "Videos", icon: <Play className="w-3.5 h-3.5" /> },
  { key: "audience", label: "Audience", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "traffic", label: "Traffic Sources", icon: <Route className="w-3.5 h-3.5" /> },
  { key: "geography", label: "Geography", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "devices", label: "Devices", icon: <Monitor className="w-3.5 h-3.5" /> },
  { key: "revenue", label: "Revenue", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "growth_funnel", label: "Growth Funnel", icon: <Target className="w-3.5 h-3.5" /> },
];

function AnalyticsContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const { isLoading: workspaceLoading } = useWorkspace();

  // Existing Data API hooks
  const { data: channelSnapshots = [], isLoading: loadingChannel } = useYouTubeChannelStats(90);
  const { data: videoStats = [], isLoading: loadingVideos } = useYouTubeVideoStats(50);
  const { data: goal } = useGrowthGoal();
  const syncYouTube = useSyncYouTube();

  const daysForRange = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  // New Analytics API hooks — fetch 2x range for period-over-period comparisons
  const { data: channelAnalytics = [], isLoading: loadingAnalytics } = useChannelAnalytics(daysForRange * 2);
  const { data: videoAnalytics = [], isLoading: loadingVideoAnalytics } = useVideoAnalytics(daysForRange);
  const { data: demographics = [], isLoading: loadingDemographics } = useDemographics();
  const { data: trafficSources = [], isLoading: loadingTraffic } = useTrafficSources(daysForRange * 2);
  const { data: geography = [], isLoading: loadingGeo } = useGeography();
  const { data: deviceTypes = [], isLoading: loadingDevices } = useDeviceTypes();
  const syncAnalytics = useSyncYouTubeAnalytics();

  // Auto-sync YouTube data and analytics on page load
  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasSynced.current || workspaceLoading) return;
    hasSynced.current = true;
    syncYouTube.mutate();
    syncAnalytics.mutate({});
  }, [workspaceLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = workspaceLoading || loadingChannel || loadingVideos;

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

  // Sorted video table data with engagement score, enriched with Analytics API data
  const sortedVideos = useMemo(
    () => {
      // Build a lookup of analytics data by video ID (latest entry per video)
      const analyticsMap = new Map<string, (typeof videoAnalytics)[0]>();
      for (const va of videoAnalytics) {
        const existing = analyticsMap.get(va.youtube_video_id);
        if (!existing || va.date > existing.date) {
          analyticsMap.set(va.youtube_video_id, va);
        }
      }

      return videoStats
        .slice()
        .map((v) => {
          const analytics = analyticsMap.get(v.youtube_video_id);
          const engRate = (v.views ?? 0) > 0
            ? (((v.likes ?? 0) + (v.comments ?? 0)) / (v.views ?? 1)) * 100
            : 0;
          return {
            ...v,
            // Merge Analytics API data when available (CTR already converted to % in hook)
            ctr_percent: analytics?.impressions_ctr ?? v.ctr_percent ?? 0,
            watch_time_minutes: analytics?.estimated_minutes_watched ?? v.watch_time_minutes ?? 0,
            engagementRate: +engRate.toFixed(2),
          };
        })
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    },
    [videoStats, videoAnalytics]
  );

  // Fallback: convert Data API video stats to VideoAnalytics shape for the Videos tab
  const videoStatsAsAnalytics = useMemo(() => {
    return videoStats.map((v): import("@/hooks/use-youtube-analytics-api").VideoAnalytics => ({
      id: v.id,
      workspace_id: v.workspace_id,
      youtube_video_id: v.youtube_video_id,
      title: v.title,
      date: v.fetched_at,
      views: v.views ?? 0,
      estimated_minutes_watched: v.watch_time_minutes ?? 0,
      average_view_duration_seconds: v.avg_view_duration_seconds ?? 0,
      average_view_percentage: 0,
      subscribers_gained: 0,
      subscribers_lost: 0,
      likes: v.likes ?? 0,
      dislikes: 0,
      comments: v.comments ?? 0,
      shares: 0,
      impressions: 0,
      impressions_ctr: v.ctr_percent ?? 0,
      card_clicks: 0,
      card_impressions: 0,
      end_screen_element_clicks: 0,
      end_screen_element_impressions: 0,
      annotation_click_through_rate: 0,
      estimated_revenue: 0,
      fetched_at: v.fetched_at,
    }));
  }, [videoStats]);

  // Top 5 performing videos by engagement score
  const topVideos = useMemo(() => {
    return sortedVideos
      .slice()
      .sort((a, b) => {
        const maxViews = Math.max(...sortedVideos.map((v) => v.views ?? 0), 1);
        const scoreA = ((a.views ?? 0) / maxViews) * 40 + (a.engagementRate ?? 0) * 3 + (a.ctr_percent ?? 0) * 2;
        const scoreB = ((b.views ?? 0) / maxViews) * 40 + (b.engagementRate ?? 0) * 3 + (b.ctr_percent ?? 0) * 2;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [sortedVideos]);

  // Views trend
  const viewsTrend = useMemo(() => {
    return filteredSnapshots.map((s) => ({
      date: format(new Date(s.fetched_at), "MMM d"),
      views: s.total_view_count,
    }));
  }, [filteredSnapshots]);

  const latestSnapshot = channelSnapshots.length > 0
    ? channelSnapshots.reduce((a, b) => new Date(a.fetched_at) > new Date(b.fetched_at) ? a : b)
    : null;

  // Analytics API summary for overview tab
  const analyticsSummary = useMemo(() => {
    if (channelAnalytics.length === 0) return null;
    const cutoff = subDays(new Date(), daysForRange);
    const filtered = channelAnalytics
      .filter((d) => new Date(d.date) >= cutoff);
    if (filtered.length === 0) return null;

    return filtered.reduce(
      (acc, d) => ({
        views: acc.views + d.views,
        watchTime: acc.watchTime + d.estimated_minutes_watched,
        subsGained: acc.subsGained + d.subscribers_gained,
        subsLost: acc.subsLost + d.subscribers_lost,
        impressions: acc.impressions + d.impressions,
        likes: acc.likes + d.likes,
        comments: acc.comments + d.comments,
        shares: acc.shares + d.shares,
        revenue: acc.revenue + d.estimated_revenue,
      }),
      { views: 0, watchTime: 0, subsGained: 0, subsLost: 0, impressions: 0, likes: 0, comments: 0, shares: 0, revenue: 0 }
    );
  }, [channelAnalytics, daysForRange]);

  const handleSync = () => {
    syncYouTube.mutate(undefined, {
      onSuccess: () => toast.success("YouTube data synced successfully!"),
      onError: (err: Error) => toast.error(`Sync failed: ${err.message}`),
    });
  };

  const handleAnalyticsSync = () => {
    syncAnalytics.mutate(undefined, {
      onSuccess: () => toast.success("YouTube Analytics synced!"),
      onError: (err: Error) => toast.error(`Analytics sync failed: ${err.message}`),
    });
  };

  const handleSyncAll = () => {
    handleSync();
    handleAnalyticsSync();
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
      {/* Sync Status Bar */}
      <SyncStatusBar />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Channel performance, audience insights, traffic sources, and revenue data.
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
            onClick={handleSyncAll}
            disabled={syncYouTube.isPending || syncAnalytics.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${(syncYouTube.isPending || syncAnalytics.isPending) ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-card text-foreground border border-border border-b-transparent -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          latestSnapshot={latestSnapshot}
          subGrowthMetrics={subGrowthMetrics}
          videoEngagement={videoEngagement}
          subscriberTrend={subscriberTrend}
          viewsTrend={viewsTrend}
          topVideos={topVideos}
          goal={goal}
          daysForRange={daysForRange}
          analyticsSummary={analyticsSummary}
          sortedVideos={sortedVideos}
          channelSnapshots={channelSnapshots}
          videoStats={videoStats}
        />
      )}

      {activeTab === "channel" && (
        <ChannelOverview data={channelAnalytics} daysRange={daysForRange} currentSubscribers={latestSnapshot?.subscriber_count} />
      )}

      {activeTab === "videos" && (
        <VideoDeepDive data={videoAnalytics.length > 0 ? videoAnalytics : videoStatsAsAnalytics} daysRange={daysForRange} />
      )}

      {activeTab === "audience" && (
        <AudienceDemographics data={demographics} />
      )}

      {activeTab === "traffic" && (
        <TrafficSources data={trafficSources} daysRange={daysForRange} />
      )}

      {activeTab === "geography" && (
        <GeographyBreakdown data={geography} />
      )}

      {activeTab === "devices" && (
        <DeviceBreakdown data={deviceTypes} />
      )}

      {activeTab === "revenue" && (
        <RevenueAnalytics channelData={channelAnalytics} videoData={videoAnalytics} daysRange={daysForRange} />
      )}

      {activeTab === "growth_funnel" && (
        <SubscriberFunnel />
      )}
    </div>
  );
}

// ── Overview Tab (preserves existing analytics + adds Analytics API summary) ──

interface OverviewTabProps {
  latestSnapshot: any;
  subGrowthMetrics: any;
  videoEngagement: any;
  subscriberTrend: any[];
  viewsTrend: any[];
  topVideos: any[];
  goal: any;
  daysForRange: number;
  analyticsSummary: any;
  sortedVideos: any[];
  channelSnapshots: any[];
  videoStats: any[];
}

type OverviewSortField = "title" | "views" | "likes" | "comments" | "ctr" | "engagement" | "watchTime" | "published";
type SortDir = "asc" | "desc";

function OverviewTab({
  latestSnapshot, subGrowthMetrics, videoEngagement, subscriberTrend,
  viewsTrend, topVideos, goal, daysForRange, analyticsSummary, sortedVideos,
  channelSnapshots, videoStats,
}: OverviewTabProps) {
  const navigate = useNavigate();
  const [tableSortField, setTableSortField] = useState<OverviewSortField>("views");
  const [tableSortDir, setTableSortDir] = useState<SortDir>("desc");

  const handleTableSort = (field: OverviewSortField) => {
    if (tableSortField === field) {
      setTableSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setTableSortField(field);
      setTableSortDir(field === "title" ? "asc" : "desc");
    }
  };

  const tableSortedVideos = useMemo(() => {
    const dir = tableSortDir === "asc" ? 1 : -1;
    return [...sortedVideos].sort((a: any, b: any) => {
      switch (tableSortField) {
        case "title":
          return dir * (a.title ?? "").localeCompare(b.title ?? "");
        case "views":
          return dir * ((a.views ?? 0) - (b.views ?? 0));
        case "likes":
          return dir * ((a.likes ?? 0) - (b.likes ?? 0));
        case "comments":
          return dir * ((a.comments ?? 0) - (b.comments ?? 0));
        case "ctr":
          return dir * ((a.ctr_percent ?? 0) - (b.ctr_percent ?? 0));
        case "engagement":
          return dir * ((a.engagementRate ?? 0) - (b.engagementRate ?? 0));
        case "watchTime":
          return dir * ((a.watch_time_minutes ?? 0) - (b.watch_time_minutes ?? 0));
        case "published":
          return dir * (new Date(a.published_at ?? 0).getTime() - new Date(b.published_at ?? 0).getTime());
        default:
          return dir * ((b.views ?? 0) - (a.views ?? 0));
      }
    });
  }, [sortedVideos, tableSortField, tableSortDir]);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

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

  // Publish frequency data
  const publishFrequency = useMemo(() => {
    const published = videoStats
      .filter((v: any) => v.published_at)
      .sort((a: any, b: any) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime());

    if (published.length < 2) return null;

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

    const gaps: number[] = [];
    for (let i = 1; i < published.length; i++) {
      gaps.push(differenceInDays(new Date(published[i].published_at!), new Date(published[i - 1].published_at!)));
    }
    const avgGap = gaps.length > 0 ? +(gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length).toFixed(1) : null;

    return { entries, avgPerWeek, avgGap };
  }, [videoStats]);

  // Scatter data
  const scatterData = useMemo(
    () =>
      videoStats
        .filter((v: any) => v.views != null && v.ctr_percent != null)
        .map((v: any) => ({
          title: v.title,
          views: v.views!,
          ctr: +(v.ctr_percent!).toFixed(1),
        })),
    [videoStats]
  );

  return (
    <>
      {/* Analytics API Enhanced KPIs (if available) */}
      {analyticsSummary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">YouTube Analytics API — {daysForRange} Day Summary</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <MiniStat label="Views" value={fmtCount(analyticsSummary.views)} />
            <MiniStat label="Watch Time" value={analyticsSummary.watchTime >= 60 ? `${Math.round(analyticsSummary.watchTime / 60)}h` : `${analyticsSummary.watchTime}m`} />
            <MiniStat label="Subs Gained" value={`+${fmtCount(analyticsSummary.subsGained)}`} />
            <MiniStat label="Subs Lost" value={`-${fmtCount(analyticsSummary.subsLost)}`} />
            <MiniStat label="Impressions" value={fmtCount(analyticsSummary.impressions)} />
            <MiniStat label="Likes" value={fmtCount(analyticsSummary.likes)} />
            <MiniStat label="Shares" value={fmtCount(analyticsSummary.shares)} />
            {analyticsSummary.revenue > 0 && (
              <MiniStat label="Revenue" value={`$${analyticsSummary.revenue.toFixed(2)}`} />
            )}
          </div>
        </div>
      )}

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [value.toLocaleString(), "Subscribers"]}
                />
                <Area type="monotone" dataKey="subscribers" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#subGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

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
                  contentStyle={tooltipStyle}
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
            {topVideos.map((v: any, i: number) => (
              <div
                key={v.id}
                onClick={() => navigate(`/analytics/videos/${v.youtube_video_id}`)}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <span className="text-lg font-bold text-muted-foreground font-mono w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors" title={v.title ?? ""}>
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
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Cadence + Performance Quadrant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, "Videos"]}
                />
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

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
                  contentStyle={tooltipStyle}
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
                {formatAnalysis.map((row: any) => (
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

      {/* All Videos Table */}
      {sortedVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            All Videos ({sortedVideos.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <SortableTh field="title" label="Title" align="left" currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="views" label="Views" icon={<Eye className="inline h-3 w-3" />} currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="likes" label="Likes" icon={<ThumbsUp className="inline h-3 w-3" />} currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="comments" label="Comments" icon={<MessageSquare className="inline h-3 w-3" />} currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="ctr" label="CTR %" currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="engagement" label="Eng. %" currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="watchTime" label="Watch Time" icon={<Clock className="inline h-3 w-3" />} currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                  <SortableTh field="published" label="Published" currentField={tableSortField} currentDir={tableSortDir} onSort={handleTableSort} />
                </tr>
              </thead>
              <tbody>
                {tableSortedVideos.map((v: any) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/analytics/videos/${v.youtube_video_id}`)}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                  >
                    <td className="py-2 px-2 text-foreground max-w-[250px] truncate hover:text-primary transition-colors" title={v.title ?? ""}>
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
                      {v.ctr_percent > 0 ? `${Number(v.ctr_percent).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {v.engagementRate}%
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                      {v.watch_time_minutes > 0
                        ? v.watch_time_minutes >= 60
                          ? `${Math.floor(v.watch_time_minutes / 60)}h ${v.watch_time_minutes % 60}m`
                          : `${v.watch_time_minutes}m`
                        : "—"}
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
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold font-mono text-foreground">{value}</p>
    </div>
  );
}

function SortableTh({
  field, label, icon, align = "right", currentField, currentDir, onSort,
}: {
  field: OverviewSortField;
  label: string;
  icon?: React.ReactNode;
  align?: "left" | "right";
  currentField: OverviewSortField;
  currentDir: SortDir;
  onSort: (f: OverviewSortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`${align === "left" ? "text-left" : "text-right"} py-2 px-2 text-xs font-medium cursor-pointer select-none hover:text-foreground transition-colors ${
        isActive ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {icon}
        {label}
        {isActive ? (
          currentDir === "asc" ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />
        ) : (
          <ArrowUpDown className="inline h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

export default function AnalyticsPage() {
  return (
    <WorkspaceProvider>
      <AnalyticsContent />
    </WorkspaceProvider>
  );
}
