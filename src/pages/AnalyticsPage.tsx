import { useMemo } from "react";
import { BarChart3, TrendingUp, Eye, ThumbsUp, MessageSquare, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { useYouTubeChannelStats, useYouTubeVideoStats, useGrowthGoal } from "@/hooks/use-youtube-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";

function AnalyticsContent() {
  const { data: channelSnapshots = [], isLoading: loadingChannel } = useYouTubeChannelStats(90);
  const { data: videoStats = [], isLoading: loadingVideos } = useYouTubeVideoStats(50);
  const { data: goal } = useGrowthGoal();

  const isLoading = loadingChannel || loadingVideos;

  // Channel overview data for line chart
  const subscriberTrend = useMemo(
    () =>
      channelSnapshots
        .slice()
        .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
        .map((s) => ({
          date: format(new Date(s.snapshot_date), "MMM d"),
          subscribers: s.subscriber_count,
          views: s.total_view_count,
          videos: s.video_count,
        })),
    [channelSnapshots]
  );

  // Sorted video table data
  const sortedVideos = useMemo(
    () =>
      videoStats
        .slice()
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)),
    [videoStats]
  );

  // Scatter data: Views vs CTR
  const scatterData = useMemo(
    () =>
      videoStats
        .filter((v) => v.view_count != null && v.click_through_rate != null)
        .map((v) => ({
          title: v.title,
          views: v.view_count!,
          ctr: +(v.click_through_rate! * 100).toFixed(1),
        })),
    [videoStats]
  );

  // Growth velocity: subscribers gained per video
  const growthVelocity = useMemo(() => {
    if (channelSnapshots.length < 2) return null;
    const sorted = channelSnapshots.slice().sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const subGain = last.subscriber_count - first.subscriber_count;
    const videoGain = last.video_count - first.video_count;
    return videoGain > 0 ? Math.round(subGain / videoGain) : null;
  }, [channelSnapshots]);

  // Content format analysis
  const formatAnalysis = useMemo(() => {
    const patterns: Record<string, { label: string; regex: RegExp }> = {
      tutorial: { label: "Tutorials", regex: /tutorial|how to|guide|learn/i },
      review: { label: "Reviews", regex: /review|unbox|hands.on/i },
      vlog: { label: "Vlogs", regex: /vlog|day in|behind/i },
      shorts: { label: "Shorts", regex: /shorts|#short/i },
      other: { label: "Other", regex: /.*/ },
    };

    const groups: Record<string, { count: number; totalViews: number; totalLikes: number; avgCtr: number; ctrCount: number }> = {};

    for (const video of videoStats) {
      let matched = false;
      for (const [key, { regex }] of Object.entries(patterns)) {
        if (key === "other") continue;
        if (regex.test(video.title ?? "")) {
          if (!groups[key]) groups[key] = { count: 0, totalViews: 0, totalLikes: 0, avgCtr: 0, ctrCount: 0 };
          groups[key].count++;
          groups[key].totalViews += video.view_count ?? 0;
          groups[key].totalLikes += video.like_count ?? 0;
          if (video.click_through_rate != null) {
            groups[key].avgCtr += video.click_through_rate;
            groups[key].ctrCount++;
          }
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (!groups.other) groups.other = { count: 0, totalViews: 0, totalLikes: 0, avgCtr: 0, ctrCount: 0 };
        groups.other.count++;
        groups.other.totalViews += video.view_count ?? 0;
        groups.other.totalLikes += video.like_count ?? 0;
        if (video.click_through_rate != null) {
          groups.other.avgCtr += video.click_through_rate;
          groups.other.ctrCount++;
        }
      }
    }

    return Object.entries(groups).map(([key, data]) => ({
      format: patterns[key]?.label ?? key,
      count: data.count,
      avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
      avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
      avgCtr: data.ctrCount > 0 ? +((data.avgCtr / data.ctrCount) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.avgViews - a.avgViews);
  }, [videoStats]);

  const latestSnapshot = channelSnapshots.length > 0
    ? channelSnapshots.reduce((a, b) => new Date(a.snapshot_date) > new Date(b.snapshot_date) ? a : b)
    : null;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Video performance, growth metrics, and content strategy insights.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Subscribers</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {latestSnapshot ? latestSnapshot.subscriber_count.toLocaleString() : "--"}
          </p>
          {goal && (
            <p className="text-xs text-muted-foreground mt-1">
              Goal: {goal.target_value.toLocaleString()}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Views</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {latestSnapshot ? latestSnapshot.total_view_count.toLocaleString() : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Videos</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {latestSnapshot ? latestSnapshot.video_count.toLocaleString() : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Subs/Video</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {growthVelocity != null ? `+${growthVelocity}` : "--"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Growth velocity</p>
        </div>
      </div>

      {/* Subscriber Trend Chart */}
      {subscriberTrend.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Subscriber Growth Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={subscriberTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line type="monotone" dataKey="subscribers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Quadrant: Views vs CTR */}
      {scatterData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">Performance Quadrant</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Views vs Click-Through Rate — top-right quadrant = subscriber magnets
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="views" name="Views" tick={{ fontSize: 11 }} label={{ value: "Views", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis dataKey="ctr" name="CTR %" tick={{ fontSize: 11 }} label={{ value: "CTR %", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(value: number, name: string) => [name === "views" ? value.toLocaleString() : `${value}%`, name === "views" ? "Views" : "CTR"]}
              />
              <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

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
                </tr>
              </thead>
              <tbody>
                {formatAnalysis.map((row) => (
                  <tr key={row.format} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium text-foreground">{row.format}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{row.count}</td>
                    <td className="py-2 px-2 text-right text-foreground">{row.avgViews.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-foreground">{row.avgLikes.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-foreground">{row.avgCtr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Video Performance Table */}
      {sortedVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Video Performance</h2>
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
                      {(v.view_count ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {(v.like_count ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {(v.comment_count ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">
                      {v.click_through_rate != null ? `${(v.click_through_rate * 100).toFixed(1)}%` : "--"}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                      {v.average_watch_time_seconds != null
                        ? `${Math.floor(v.average_watch_time_seconds / 60)}m ${v.average_watch_time_seconds % 60}s`
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
