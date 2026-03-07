import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Eye,
  MousePointerClick,
  Play,
  TrendingUp,
  Magnet,
  Route,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSubscriberFunnel,
  type FunnelRange,
  type SubscriberFunnelData,
} from "@/hooks/use-subscriber-funnel";
import { fmtCount, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, lineDefaults, horizontalBarDefaults } from "@/lib/chart-theme";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";

const FUNNEL_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--chart-2))"];

const FUNNEL_ICONS = [
  <MousePointerClick key="imp" className="w-4 h-4" />,
  <Eye key="views" className="w-4 h-4" />,
  <Play key="engaged" className="w-4 h-4" />,
  <Users key="subs" className="w-4 h-4" />,
];

const SOURCE_LABELS: Record<string, string> = {
  ADVERTISING: "Ads",
  ANNOTATION: "Annotations",
  CAMPAIGN_CARD: "Campaign Cards",
  END_SCREEN: "End Screens",
  EXT_URL: "External URLs",
  HASHTAGS: "Hashtags",
  NO_LINK_EMBEDDED: "Embedded",
  NO_LINK_OTHER: "Other",
  NOTIFICATION: "Notifications",
  PLAYLIST: "Playlists",
  PROMOTED: "Promoted",
  RELATED_VIDEO: "Suggested",
  SHORTS: "Shorts Feed",
  SUBSCRIBER: "Subscribers",
  YT_CHANNEL: "Channel Page",
  YT_OTHER_PAGE: "Other YouTube",
  YT_PLAYLIST_PAGE: "Playlist Page",
  YT_SEARCH: "YouTube Search",
};

const TRAFFIC_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-3))", "hsl(var(--chart-2))",
  "hsl(var(--chart-1))", "hsl(var(--chart-5))", "hsl(var(--chart-4))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
];


const sourceLabel = (sourceType: string): string =>
  SOURCE_LABELS[sourceType] ?? sourceType.replace(/_/g, " ");

const RANGE_OPTIONS: { label: string; value: FunnelRange }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
    </div>
  );
}

export function SubscriberFunnel() {
  const [range, setRange] = useState<FunnelRange>("30d");
  const { data, isLoading } = useSubscriberFunnel(range);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Subscriber Growth Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.funnel.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Subscriber Growth Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No subscriber funnel data available. Sync YouTube Analytics to see your growth funnel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Subscriber Growth Funnel
          </CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={range === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Funnel Visualization */}
        <FunnelVisualization funnel={data.funnel} />

        {/* Daily Subscriber Growth */}
        {data.dailyGrowth.length > 1 && (
          <DailyGrowthChart dailyGrowth={data.dailyGrowth} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Subscriber Magnet Videos */}
          {data.magnetVideos.length > 0 && (
            <MagnetVideosTable magnetVideos={data.magnetVideos} />
          )}

          {/* Top Converting Traffic Sources */}
          {data.trafficConversions.length > 0 && (
            <TrafficConversionChart trafficConversions={data.trafficConversions} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelVisualization({ funnel }: { funnel: SubscriberFunnelData["funnel"] }) {
  const maxValue = Math.max(...funnel.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Route className="w-4 h-4 text-muted-foreground" />
        Conversion Funnel
      </h3>
      <div className="space-y-2">
        {funnel.map((step, i) => {
          const widthPct = Math.max((step.value / maxValue) * 100, 8);
          const conversionFromPrev =
            i > 0 && funnel[i - 1].value > 0
              ? ((step.value / funnel[i - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span style={{ color: FUNNEL_COLORS[i] }}>{FUNNEL_ICONS[i]}</span>
                  <span className="font-medium text-foreground">{step.label}</span>
                  {conversionFromPrev && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {conversionFromPrev}% conv.
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">
                    {fmtCount(step.value)}
                  </span>
                  <ChangeIndicator changePercent={step.changePercent} />
                </div>
              </div>
              <div className="h-8 bg-muted/50 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-3"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: FUNNEL_COLORS[i],
                    opacity: 0.85,
                  }}
                >
                  {widthPct > 20 && (
                    <span className="text-xs font-medium text-white">
                      {fmtCount(step.value)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall conversion rate callout */}
      {funnel.length >= 2 && funnel[0].value > 0 && (
        <div className="rounded-md bg-muted/50 p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            Overall conversion:{" "}
            <span className="font-mono font-semibold text-foreground">
              {((funnel[funnel.length - 1].value / funnel[0].value) * 100).toFixed(2)}%
            </span>{" "}
            from {funnel[0].label.toLowerCase()} to {funnel[funnel.length - 1].label.toLowerCase()}
          </p>
        </div>
      )}
    </div>
  );
}

function ChangeIndicator({ changePercent }: { changePercent: number }) {
  if (changePercent === 0) {
    return (
      <span className="text-xs text-muted-foreground font-medium">--</span>
    );
  }

  const isPositive = changePercent > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-green-500" : "text-red-500"
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}
      {changePercent.toFixed(1)}%
    </span>
  );
}

function DailyGrowthChart({
  dailyGrowth,
}: {
  dailyGrowth: SubscriberFunnelData["dailyGrowth"];
}) {
  const chartData = dailyGrowth.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    gained: d.gained,
    lost: -Math.abs(d.lost),
    net: d.net,
  }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">
        Daily Subscriber Growth
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="gainedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
              <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid {...cartesianGridDefaults} />
          <XAxis dataKey="date" {...xAxisDefaults} />
          <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                gained: "Gained",
                lost: "Lost",
                net: "Net",
              };
              return [Math.abs(value).toLocaleString(), labels[name] ?? name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                gained: "Gained",
                lost: "Lost",
                net: "Net",
              };
              return labels[value] ?? value;
            }}
          />
          <Area
            type="monotone"
            dataKey="gained"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2.5}
            fill="url(#gainedGrad)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          />
          <Area
            type="monotone"
            dataKey="lost"
            stroke="hsl(var(--chart-5))"
            strokeWidth={2.5}
            fill="url(#lostGrad)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MagnetVideosTable({
  magnetVideos,
}: {
  magnetVideos: SubscriberFunnelData["magnetVideos"];
}) {
  const { lookup: companyLookup } = useAllVideoCompanies();
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Magnet className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Subscriber Magnet Videos
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Top videos ranked by subscribers gained per 1,000 views
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">
                Video
              </th>
              <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                Views
              </th>
              <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                Subs
              </th>
              <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                Subs/1K
              </th>
              <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">
                CTR
              </th>
            </tr>
          </thead>
          <tbody>
            {magnetVideos.map((video, i) => (
              <tr key={video.youtube_video_id} className="border-b border-border/50">
                <td className="py-2 px-2 max-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground truncate" title={video.title}>
                      {video.title}
                    </span>
                    <VideoCompanyLogos companies={companyLookup.get(video.youtube_video_id)} />
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-mono text-foreground">
                  {fmtCount(video.views)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-green-500">
                  +{fmtCount(video.subscribers_gained)}
                </td>
                <td className="py-2 px-2 text-right">
                  <Badge
                    variant={video.conversion_rate >= 5 ? "default" : "secondary"}
                    className="font-mono text-xs"
                  >
                    {video.conversion_rate.toFixed(1)}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                  {video.impressions_ctr.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrafficConversionChart({
  trafficConversions,
}: {
  trafficConversions: SubscriberFunnelData["trafficConversions"];
}) {
  const chartData = trafficConversions.slice(0, 10).map((t) => ({
    source: sourceLabel(t.source),
    views: t.views,
    estimated_subs: t.estimated_subs,
    conversion_rate: +t.conversion_rate.toFixed(1),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Top Converting Traffic Sources
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Views and estimated subscriber contribution by traffic source
      </p>
      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 200)}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid {...cartesianGridDefaults} />
          <XAxis type="number" {...xAxisDefaults} tickFormatter={fmtCount} />
          <YAxis
            type="category"
            dataKey="source"
            {...yAxisDefaults}
            width={110}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number, name: string) => {
              if (name === "views") return [value.toLocaleString(), "Views"];
              if (name === "estimated_subs") return [value.toLocaleString(), "Est. Subs"];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="views" name="views" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="estimated_subs" name="estimated_subs" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
