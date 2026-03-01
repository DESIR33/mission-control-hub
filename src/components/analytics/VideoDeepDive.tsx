import { useMemo, useState } from "react";
import {
  Play, Eye, ThumbsUp, MessageSquare, Share2, Clock,
  MousePointerClick, Users, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtDuration = (seconds: number) => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
};

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

type SortField = "views" | "impressions" | "ctr" | "avgDuration" | "subsGained" | "revenue" | "engagement";

interface Props {
  data: VideoAnalytics[];
}

export function VideoDeepDive({ data }: Props) {
  const [sortField, setSortField] = useState<SortField>("views");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      data.map((v) => {
        const engagementRate = v.views > 0
          ? +(((v.likes + v.comments + v.shares) / v.views) * 100).toFixed(2)
          : 0;
        return { ...v, engagementRate };
      }),
    [data]
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
        default: return b.views - a.views;
      }
    });
  }, [enriched, sortField]);

  // Top 5 by views for overview
  const top5 = useMemo(() => sorted.slice(0, 5), [sorted]);

  // Scatter data: Views vs CTR
  const scatterData = useMemo(
    () =>
      enriched
        .filter((v) => v.views > 0 && v.impressions_ctr > 0)
        .map((v) => ({
          title: v.title || v.youtube_video_id,
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

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No video analytics data yet. Sync YouTube Analytics to see detailed per-video metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Videos by Views</h3>
          <ResponsiveContainer width="100%" height={top5.length * 40 + 40}>
            <BarChart data={top5.map((v) => ({ title: truncate(v.title, 40), views: v.views }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
              <YAxis type="category" dataKey="title" tick={{ fontSize: 10 }} width={250} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Quadrant: Views vs CTR */}
      {scatterData.length > 2 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Performance Quadrant</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Views vs CTR — top-right = highest potential subscriber magnets
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="views" name="Views" tick={{ fontSize: 10 }} tickFormatter={fmtCount}
                label={{ value: "Views", position: "insideBottom", offset: -5, fontSize: 10 }} />
              <YAxis dataKey="ctr" name="CTR %" tick={{ fontSize: 10 }}
                label={{ value: "CTR %", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) =>
                  name === "Views" ? [v.toLocaleString(), "Views"] : [`${v}%`, "CTR"]
                }
              />
              <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sort controls */}
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
        ] as [SortField, string][]).map(([field, label]) => (
          <button
            key={field}
            onClick={() => setSortField(field)}
            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
              sortField === field
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Video table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          All Videos ({sorted.length})
        </h3>
        <div className="space-y-1">
          {sorted.map((v) => {
            const isExpanded = expandedVideo === v.youtube_video_id;
            const netSubs = v.subscribers_gained - v.subscribers_lost;
            return (
              <div key={v.youtube_video_id} className="border-b border-border/50">
                <button
                  onClick={() => setExpandedVideo(isExpanded ? null : v.youtube_video_id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/20 rounded transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{v.title || v.youtube_video_id}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" /> {fmtCount(v.views)}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <ThumbsUp className="w-2.5 h-2.5" /> {fmtCount(v.likes)}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MousePointerClick className="w-2.5 h-2.5" /> {v.impressions_ctr.toFixed(1)}% CTR
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {fmtDuration(v.average_view_duration_seconds)}
                      </span>
                      {netSubs !== 0 && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${netSubs > 0 ? "text-green-500" : "text-red-500"}`}>
                          <Users className="w-2.5 h-2.5" /> {netSubs > 0 ? "+" : ""}{netSubs} subs
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-semibold text-primary">{v.engagementRate}%</span>
                    <p className="text-[10px] text-muted-foreground">engagement</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      <DetailStat label="Views" value={v.views.toLocaleString()} />
                      <DetailStat label="Impressions" value={fmtCount(v.impressions)} />
                      <DetailStat label="Impressions CTR" value={`${v.impressions_ctr.toFixed(2)}%`} />
                      <DetailStat label="Avg View Duration" value={fmtDuration(v.average_view_duration_seconds)} />
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
                      {v.estimated_revenue > 0 && (
                        <DetailStat label="Revenue" value={fmtMoney(v.estimated_revenue)} />
                      )}
                      <DetailStat label="Engagement Rate" value={`${v.engagementRate}%`} />
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function DetailStat({ label, value, positive, negative }: {
  label: string; value: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="bg-muted/30 rounded px-2 py-1.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-mono font-semibold mt-0.5 ${
        positive ? "text-green-500" : negative ? "text-red-500" : "text-foreground"
      }`}>{value}</p>
    </div>
  );
}

function truncate(str: string, len: number) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}
