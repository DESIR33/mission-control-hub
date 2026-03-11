import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play, Eye, ThumbsUp, MessageSquare, Share2, Clock,
  MousePointerClick, Users, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, ArrowUpRight, FileText, Search,
  Handshake, CalendarDays, Building2, LinkSlash,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { VideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useVideoNotesCheck } from "@/hooks/use-video-notes";
import { useVideoRevenueLookup } from "@/hooks/use-video-revenue-lookup";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { useSponsoredVideos } from "@/hooks/use-sponsored-videos";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";
import { fmtCount, fmtDuration, fmtMoney, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, horizontalBarDefaults, SEMANTIC_COLORS } from "@/lib/chart-theme";

type SortField = "views" | "impressions" | "ctr" | "avgDuration" | "subsGained" | "revenue" | "engagement" | "uploadDate";

interface Props {
  data: VideoAnalytics[];
  daysRange?: number;
}

export function VideoDeepDive({ data, daysRange }: Props) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("uploadDate");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<"all" | "linked" | "unlinked">("all");
  const { data: notesSet } = useVideoNotesCheck();
  const { lookup: revenueLookup } = useVideoRevenueLookup();
  const { data: videoStatsList } = useYouTubeVideoStats(500);
  const { lookup: companyLookup } = useAllVideoCompanies();
  const { sponsoredSet } = useSponsoredVideos();
  const publishedAtMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of videoStatsList ?? []) {
      if (v.published_at && !map.has(v.youtube_video_id)) {
        map.set(v.youtube_video_id, v.published_at);
      }
    }
    return map;
  }, [videoStatsList]);

  // Feature 2: Aggregation — group rows by youtube_video_id
  const aggregated = useMemo(() => {
    const grouped = new Map<string, VideoAnalytics[]>();
    for (const row of data) {
      const existing = grouped.get(row.youtube_video_id);
      if (existing) {
        existing.push(row);
      } else {
        grouped.set(row.youtube_video_id, [row]);
      }
    }

    const results: VideoAnalytics[] = [];
    for (const [videoId, rows] of grouped) {
      // Find the latest row by date for title and metadata
      const latest = rows.reduce((a, b) => (a.date >= b.date ? a : b));

      // Sum fields
      const views = rows.reduce((s, r) => s + r.views, 0);
      const likes = rows.reduce((s, r) => s + r.likes, 0);
      const dislikes = rows.reduce((s, r) => s + r.dislikes, 0);
      const comments = rows.reduce((s, r) => s + r.comments, 0);
      const shares = rows.reduce((s, r) => s + r.shares, 0);
      const estimated_minutes_watched = rows.reduce((s, r) => s + r.estimated_minutes_watched, 0);
      const subscribers_gained = rows.reduce((s, r) => s + r.subscribers_gained, 0);
      const subscribers_lost = rows.reduce((s, r) => s + r.subscribers_lost, 0);
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const estimated_revenue = rows.reduce((s, r) => s + r.estimated_revenue, 0);
      const card_clicks = rows.reduce((s, r) => s + r.card_clicks, 0);
      const card_impressions = rows.reduce((s, r) => s + r.card_impressions, 0);
      const end_screen_element_clicks = rows.reduce((s, r) => s + r.end_screen_element_clicks, 0);
      const end_screen_element_impressions = rows.reduce((s, r) => s + r.end_screen_element_impressions, 0);

      // Weighted averages by views
      const totalViews = views;
      const average_view_duration_seconds = totalViews > 0
        ? rows.reduce((s, r) => s + Number(r.average_view_duration_seconds) * r.views, 0) / totalViews
        : 0;
      const average_view_percentage = totalViews > 0
        ? rows.reduce((s, r) => s + Number(r.average_view_percentage) * r.views, 0) / totalViews
        : 0;

      // Weighted average CTR across daily rows
      const impressions_ctr = impressions > 0
        ? rows.reduce((s, r) => s + r.impressions_ctr * r.impressions, 0) / impressions
        : 0;

      results.push({
        ...latest,
        youtube_video_id: videoId,
        title: latest.title,
        date: latest.date,
        views,
        likes,
        dislikes,
        comments,
        shares,
        estimated_minutes_watched,
        subscribers_gained,
        subscribers_lost,
        impressions,
        estimated_revenue,
        card_clicks,
        card_impressions,
        end_screen_element_clicks,
        end_screen_element_impressions,
        average_view_duration_seconds,
        average_view_percentage,
        impressions_ctr,
      });
    }
    return results;
  }, [data]);

  const enriched = useMemo(
    () =>
      aggregated.map((v) => {
        const engagementRate = v.views > 0
          ? +(((v.likes + v.comments + v.shares) / v.views) * 100).toFixed(2)
          : 0;
        return { ...v, engagementRate };
      }),
    [aggregated]
  );

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      switch (sortField) {
        case "views": return b.views - a.views;
        case "impressions": return b.impressions - a.impressions;
        case "ctr": return b.impressions_ctr - a.impressions_ctr;
        case "avgDuration": return b.average_view_duration_seconds - a.average_view_duration_seconds;
        case "subsGained": return (b.subscribers_gained - b.subscribers_lost) - (a.subscribers_gained - a.subscribers_lost);
        case "revenue": return b.estimated_revenue - a.estimated_revenue;
        case "engagement": return b.engagementRate - a.engagementRate;
        case "uploadDate": {
          const aDate = publishedAtMap.get(a.youtube_video_id) ?? "";
          const bDate = publishedAtMap.get(b.youtube_video_id) ?? "";
          return bDate.localeCompare(aDate); // newest first
        }
        default: return b.views - a.views;
      }
    });
  }, [enriched, sortField, publishedAtMap]);

  // Feature 10: Video Search — filter sorted videos by title
  const filteredVideos = useMemo(() => {
    let result = sorted;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v) => (v.title || "Untitled Video").toLowerCase().includes(q));
    }
    if (companyFilter === "unlinked") {
      result = result.filter((v) => !companyLookup.has(v.youtube_video_id));
    } else if (companyFilter === "linked") {
      result = result.filter((v) => companyLookup.has(v.youtube_video_id));
    }
    return result;
  }, [sorted, searchQuery, companyFilter, companyLookup]);

  // Top 5 by views for overview
  const top5 = useMemo(() => sorted.slice(0, 5), [sorted]);

  // Scatter data: Views vs CTR
  const scatterData = useMemo(
    () =>
      enriched
        .filter((v) => v.views > 0 && v.impressions_ctr > 0)
        .map((v) => ({
          title: v.title || "Untitled Video",
          views: v.views,
          ctr: v.impressions_ctr,
          subs: v.subscribers_gained - v.subscribers_lost,
        })),
    [enriched]
  );

  // Aggregate totals
  const totals = useMemo(() => {
    return enriched.reduce(
      (acc, v) => ({
        views: acc.views + v.views,
        watchTime: acc.watchTime + v.estimated_minutes_watched,
        likes: acc.likes + v.likes,
        comments: acc.comments + v.comments,
        shares: acc.shares + v.shares,
        subsGained: acc.subsGained + v.subscribers_gained,
        subsLost: acc.subsLost + v.subscribers_lost,
        impressions: acc.impressions + v.impressions,
        revenue: acc.revenue + v.estimated_revenue,
        cardClicks: acc.cardClicks + v.card_clicks,
        endScreenClicks: acc.endScreenClicks + v.end_screen_element_clicks,
      }),
      { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0, subsGained: 0, subsLost: 0, impressions: 0, revenue: 0, cardClicks: 0, endScreenClicks: 0 }
    );
  }, [enriched]);

  // Feature 11: CTR Outlier Analysis (Thumbnail Intelligence)
  const ctrAnalysis = useMemo(() => {
    const videosWithImpressions = enriched.filter((v) => v.impressions > 0);
    const channelAvgCTR = videosWithImpressions.length > 0
      ? videosWithImpressions.reduce((s, v) => s + v.impressions_ctr, 0) / videosWithImpressions.length
      : 0;

    const topCTRPerformers = videosWithImpressions
      .filter((v) => v.impressions_ctr > channelAvgCTR * 1.3)
      .sort((a, b) => b.impressions_ctr - a.impressions_ctr)
      .slice(0, 5);

    const thumbnailOpportunities = videosWithImpressions
      .filter((v) => v.impressions > 1000 && v.impressions_ctr < channelAvgCTR * 0.7)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);

    return { channelAvgCTR, topCTRPerformers, thumbnailOpportunities };
  }, [enriched]);

  // Feature 12: Video Performance Benchmarks
  const channelBenchmarks = useMemo(() => {
    if (enriched.length === 0) return { avgViews: 0, avgCTR: 0, avgDuration: 0, avgEngagement: 0 };
    const avgViews = enriched.reduce((s, v) => s + v.views, 0) / enriched.length;
    const withImpressions = enriched.filter((v) => v.impressions > 0);
    const avgCTR = withImpressions.length > 0
      ? withImpressions.reduce((s, v) => s + v.impressions_ctr, 0) / withImpressions.length
      : 0;
    const avgDuration = enriched.reduce((s, v) => s + v.average_view_duration_seconds, 0) / enriched.length;
    const avgEngagement = enriched.reduce((s, v) => s + v.engagementRate, 0) / enriched.length;
    return { avgViews, avgCTR, avgDuration, avgEngagement };
  }, [enriched]);

  const getAboveAvgCount = (v: typeof enriched[0]) => {
    let count = 0;
    if (v.views > channelBenchmarks.avgViews) count++;
    if (v.impressions > 0 && v.impressions_ctr > channelBenchmarks.avgCTR) count++;
    if (v.average_view_duration_seconds > channelBenchmarks.avgDuration) count++;
    if (v.engagementRate > channelBenchmarks.avgEngagement) count++;
    return count;
  };

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No video analytics data yet. Sync YouTube Analytics to see detailed per-video metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <MiniKpi label="Total Views" value={fmtCount(totals.views)} />
        <MiniKpi label="Watch Time" value={totals.watchTime >= 60 ? `${Math.round(totals.watchTime / 60)}h` : `${totals.watchTime}m`} />
        <MiniKpi label="Net Subs" value={`+${fmtCount(totals.subsGained - totals.subsLost)}`} />
        <MiniKpi label="Impressions" value={fmtCount(totals.impressions)} />
        <MiniKpi label="Card Clicks" value={fmtCount(totals.cardClicks)} />
        {totals.revenue > 0 && <MiniKpi label="Revenue" value={fmtMoney(totals.revenue)} />}
      </div>

      {/* Top 5 videos bar chart */}
      {top5.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Videos by Views</h3>
          <ResponsiveContainer width="100%" height={top5.length * 40 + 40}>
            <BarChart data={top5.map((v) => ({ title: truncate(v.title, 40), views: v.views }))} layout="vertical">
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis type="number" {...xAxisDefaults} tickFormatter={fmtCount} />
              <YAxis type="category" dataKey="title" {...yAxisDefaults} width={250} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
              <Bar dataKey="views" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={32} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Quadrant: Views vs CTR */}
      {scatterData.length > 2 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Performance Quadrant</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Views vs CTR — top-right = highest potential subscriber magnets
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="views" name="Views" {...xAxisDefaults} tickFormatter={fmtCount}
                label={{ value: "Views", position: "insideBottom", offset: -5, fontSize: 10 }} />
              <YAxis dataKey="ctr" name="CTR %" {...yAxisDefaults}
                label={{ value: "CTR %", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number, name: string) =>
                  name === "Views" ? [v.toLocaleString(), "Views"] : [`${v}%`, "CTR"]
                }
              />
              <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Feature 11: CTR Outlier Analysis (Thumbnail Intelligence) */}
      {(ctrAnalysis.topCTRPerformers.length > 0 || ctrAnalysis.thumbnailOpportunities.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Thumbnail Intelligence</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Channel Avg CTR: {ctrAnalysis.channelAvgCTR.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Top CTR Performers */}
            {ctrAnalysis.topCTRPerformers.length > 0 && (
              <div className="rounded-xl border-2 border-green-500/50 bg-card p-4">
                <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Top CTR Performers
                </h4>
                <div className="space-y-1.5">
                  {ctrAnalysis.topCTRPerformers.map((v) => (
                    <div key={v.youtube_video_id} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-green-600 dark:text-green-400 shrink-0 w-14 text-right">
                        {v.impressions_ctr.toFixed(1)}%
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {v.title || "Untitled Video"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thumbnail Opportunities */}
            {ctrAnalysis.thumbnailOpportunities.length > 0 && (
              <div className="rounded-xl border-2 border-amber-500/50 bg-card p-4">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Thumbnail Opportunities
                </h4>
                <div className="space-y-1.5">
                  {ctrAnalysis.thumbnailOpportunities.map((v) => (
                    <div key={v.youtube_video_id} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 shrink-0 w-14 text-right">
                        {v.impressions_ctr.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({fmtCount(v.impressions)} imp.)
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {v.title || "Untitled Video"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature 10: Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search videos by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Sort & Filter controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Sort by:</span>
        {([
          ["views", "Views"],
          ["impressions", "Impressions"],
          ["ctr", "CTR"],
          ["avgDuration", "Duration"],
          ["subsGained", "Subs Gained"],
          ["engagement", "Engagement"],
          ["revenue", "Revenue"],
          ["uploadDate", "Upload Date"],
        ] as [SortField, string][]).map(([field, label]) => (
          <button
            key={field}
            onClick={() => setSortField(field)}
            className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
              sortField === field
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}

        <span className="text-xs text-muted-foreground ml-2">Company:</span>
        {([
          ["all", "All", null],
          ["linked", "Linked", <Building2 key="b" className="w-3 h-3 mr-0.5" />],
          ["unlinked", "Unlinked", <LinkSlash key="l" className="w-3 h-3 mr-0.5" />],
        ] as [typeof companyFilter, string, React.ReactNode][]).map(([value, label, icon]) => (
          <button
            key={value}
            onClick={() => setCompanyFilter(value)}
            className={`px-2 py-1 text-xs rounded-lg border transition-colors flex items-center ${
              companyFilter === value
                ? value === "unlinked"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Video table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {searchQuery.trim()
            ? `Showing ${filteredVideos.length} of ${sorted.length} videos`
            : `All Videos (${sorted.length})`}
        </h3>
        <div className="space-y-1">
          {filteredVideos.map((v) => {
            const isExpanded = expandedVideo === v.youtube_video_id;
            const netSubs = v.subscribers_gained - v.subscribers_lost;
            const aboveAvgCount = getAboveAvgCount(v);
            return (
              <div key={v.youtube_video_id} className="border-b border-border/50">
                <div className="w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/20 rounded transition-colors text-left">
                  <button
                    onClick={() => navigate(`/analytics/videos/${v.youtube_video_id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">{v.title || "Untitled Video"}</p>
                      {sponsoredSet.has(v.youtube_video_id) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                          <Handshake className="w-2.5 h-2.5" />
                          Sponsored
                        </span>
                      )}
                      <VideoCompanyLogos companies={companyLookup.get(v.youtube_video_id)} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {(() => {
                        const pubDate = publishedAtMap.get(v.youtube_video_id);
                        return pubDate ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <CalendarDays className="w-2.5 h-2.5" /> {format(new Date(pubDate), "MMM d, yyyy")}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <ThumbsUp className="w-2.5 h-2.5" /> {fmtCount(v.likes)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MousePointerClick className="w-2.5 h-2.5" /> {v.impressions_ctr.toFixed(1)}% CTR
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {fmtDuration(v.average_view_duration_seconds)}
                      </span>
                      {v.estimated_minutes_watched > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {v.estimated_minutes_watched >= 60
                            ? `${Math.round(v.estimated_minutes_watched / 60)}h`
                            : `${v.estimated_minutes_watched}m`} watched
                        </span>
                      )}
                      {netSubs !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 ${netSubs > 0 ? "text-green-500" : "text-red-500"}`}>
                          <Users className="w-2.5 h-2.5" /> {netSubs > 0 ? "+" : ""}{netSubs} subs
                        </span>
                      )}
                      {notesSet?.has(v.youtube_video_id) && (
                        <span className="text-xs text-primary flex items-center gap-0.5">
                          <FileText className="w-2.5 h-2.5" /> Notes
                        </span>
                      )}
                      {(() => {
                        const combinedRev = revenueLookup.get(v.youtube_video_id);
                        const totalRev = combinedRev?.totalRevenue ?? (v.estimated_revenue > 0 ? v.estimated_revenue : 0);
                        return totalRev > 0 ? (
                          <span className="text-xs text-green-500 flex items-center gap-0.5">
                            <DollarSign className="w-2.5 h-2.5" /> ${totalRev.toFixed(0)}{combinedRev ? " total" : ""}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </button>
                  {/* Feature 12: Above-average badge */}
                  <div className="shrink-0">
                    <span className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 ${
                      aboveAvgCount >= 3
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : aboveAvgCount >= 2
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {aboveAvgCount}/4
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-semibold text-primary">{v.engagementRate}%</span>
                    <p className="text-xs text-muted-foreground">engagement</p>
                  </div>
                  <button
                    onClick={() => setExpandedVideo(isExpanded ? null : v.youtube_video_id)}
                    className="shrink-0 p-1 hover:bg-muted rounded"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      <DetailStat label="Views" value={v.views.toLocaleString()} />
                      <DetailStat label="Impressions" value={fmtCount(v.impressions)} />
                      <DetailStat
                        label="Impressions CTR"
                        value={`${v.impressions_ctr.toFixed(2)}%`}
                        benchmark={v.impressions > 0 ? (v.impressions_ctr > channelBenchmarks.avgCTR ? "above" : "below") : undefined}
                      />
                      <DetailStat
                        label="Avg View Duration"
                        value={fmtDuration(v.average_view_duration_seconds)}
                        benchmark={v.average_view_duration_seconds > channelBenchmarks.avgDuration ? "above" : "below"}
                      />
                      <DetailStat label="Avg View %" value={`${v.average_view_percentage.toFixed(1)}%`} />
                      <DetailStat label="Watch Time" value={v.estimated_minutes_watched >= 60 ? `${Math.round(v.estimated_minutes_watched / 60)}h` : `${v.estimated_minutes_watched}m`} />
                      <DetailStat label="Likes" value={v.likes.toLocaleString()} />
                      <DetailStat label="Dislikes" value={v.dislikes.toLocaleString()} />
                      <DetailStat label="Comments" value={v.comments.toLocaleString()} />
                      <DetailStat label="Shares" value={v.shares.toLocaleString()} />
                      <DetailStat label="Subs Gained" value={`+${v.subscribers_gained}`} positive />
                      <DetailStat label="Subs Lost" value={`-${v.subscribers_lost}`} negative />
                      <DetailStat label="Card Clicks" value={v.card_clicks.toLocaleString()} />
                      <DetailStat label="Card Impressions" value={v.card_impressions.toLocaleString()} />
                      <DetailStat label="End Screen Clicks" value={v.end_screen_element_clicks.toLocaleString()} />
                      <DetailStat label="End Screen Imp." value={v.end_screen_element_impressions.toLocaleString()} />
                      {(() => {
                        const combinedRev = revenueLookup.get(v.youtube_video_id);
                        if (combinedRev && combinedRev.totalRevenue > 0) {
                          return (
                            <>
                              <DetailStat label="Total Revenue" value={fmtMoney(combinedRev.totalRevenue)} />
                              {combinedRev.adRevenue > 0 && <DetailStat label="Ad Revenue" value={fmtMoney(combinedRev.adRevenue)} />}
                              {combinedRev.dealRevenue > 0 && <DetailStat label="Deal Revenue" value={fmtMoney(combinedRev.dealRevenue)} />}
                              {combinedRev.affiliateRevenue > 0 && <DetailStat label="Affiliate Revenue" value={fmtMoney(combinedRev.affiliateRevenue)} />}
                            </>
                          );
                        }
                        return v.estimated_revenue > 0 ? <DetailStat label="Revenue" value={fmtMoney(v.estimated_revenue)} /> : null;
                      })()}
                      <DetailStat
                        label="Engagement Rate"
                        value={`${v.engagementRate}%`}
                        benchmark={v.engagementRate > channelBenchmarks.avgEngagement ? "above" : "below"}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-card/80">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function DetailStat({ label, value, positive, negative, benchmark }: {
  label: string; value: string; positive?: boolean; negative?: boolean; benchmark?: "above" | "below";
}) {
  return (
    <div className="bg-muted/30 rounded px-2 py-1.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {benchmark && (
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
            benchmark === "above" ? "bg-green-500" : "bg-red-500"
          }`} />
        )}
        <p className={`text-xs font-mono font-semibold ${
          positive ? "text-green-500" : negative ? "text-red-500" : "text-foreground"
        }`}>{value}</p>
      </div>
    </div>
  );
}

function truncate(str: string, len: number) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}
