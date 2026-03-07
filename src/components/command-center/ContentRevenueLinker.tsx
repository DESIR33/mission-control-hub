import {
  DollarSign, TrendingUp, Video, PieChart as PieChartIcon,
  ArrowUpRight, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useContentRevenue } from "@/hooks/use-content-revenue";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";
import {
  chartTooltipStyle,
  fmtMoney,
  xAxisDefaults,
  yAxisDefaults,
  cartesianGridDefaults,
  horizontalBarDefaults,
} from "@/lib/chart-theme";

const COLORS = ["#22c55e", "#3b82f6", "#a855f7"];

export function ContentRevenueLinker() {
  const { data: summary, isLoading } = useContentRevenue();
  const { lookup: companyLookup } = useAllVideoCompanies();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No revenue data linked to content yet. Link deals and affiliate transactions to videos.</p>
      </div>
    );
  }

  const chartData = summary.links.slice(0, 10).map((l) => ({
    title: l.videoTitle.length > 30 ? l.videoTitle.substring(0, 30) + "…" : l.videoTitle,
    ad: l.adRevenue,
    sponsor: l.dealRevenue,
    affiliate: l.affiliateRevenue,
  }));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(summary.grandTotal)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Video className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg/Video</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(summary.avgRevenuePerVideo)}</p>
        </div>

        {summary.topEarner && (
          <div className="rounded-xl border border-border bg-card p-3 col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Earner</p>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{summary.topEarner.videoTitle}</p>
            <p className="text-xs text-muted-foreground">{fmtMoney(summary.topEarner.totalRevenue)} total</p>
          </div>
        )}
      </div>

      {/* Revenue by Source Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Source</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={summary.revenueBySource.filter((s) => s.amount > 0)}
                dataKey="amount"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {summary.revenueBySource.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Breakdown</h3>
          <div className="space-y-3">
            {summary.revenueBySource.map((source, i) => (
              <div key={source.source} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{source.source}</p>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${summary.grandTotal > 0 ? (source.amount / summary.grandTotal) * 100 : 0}%`,
                        backgroundColor: COLORS[i],
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm font-mono font-semibold text-foreground">{fmtMoney(source.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Videos by Revenue */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Videos by Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis type="number" {...xAxisDefaults} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="title" width={150} {...yAxisDefaults} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
            <Legend />
            <Bar dataKey="ad" stackId="a" fill="#22c55e" name="Ad Revenue" {...horizontalBarDefaults} animationDuration={800} />
            <Bar dataKey="sponsor" stackId="a" fill="#3b82f6" name="Sponsorship" {...horizontalBarDefaults} animationDuration={800} />
            <Bar dataKey="affiliate" stackId="a" fill="#a855f7" name="Affiliate" {...horizontalBarDefaults} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Video Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-2 text-muted-foreground font-medium">Video</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Ad Rev</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Sponsor</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Affiliate</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Total</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Rev/View</th>
              </tr>
            </thead>
            <tbody>
              {summary.links.slice(0, 20).map((link) => (
                <tr key={link.videoQueueId} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2 text-foreground max-w-[200px]">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{link.videoTitle}</span>
                      {link.youtubeVideoId && <VideoCompanyLogos companies={companyLookup.get(link.youtubeVideoId)} />}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono text-green-400">{fmtMoney(link.adRevenue)}</td>
                  <td className="p-2 text-right font-mono text-blue-400">{fmtMoney(link.dealRevenue)}</td>
                  <td className="p-2 text-right font-mono text-purple-400">{fmtMoney(link.affiliateRevenue)}</td>
                  <td className="p-2 text-right font-mono font-semibold text-foreground">{fmtMoney(link.totalRevenue)}</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">
                    ${link.revenuePerView.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
