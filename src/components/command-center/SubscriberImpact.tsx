import { useSubscriberImpact } from "@/hooks/use-subscriber-impact";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Users, TrendingUp, Award, Target } from "lucide-react";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";
import {
  chartTooltipStyle,
  fmtCount,
  xAxisDefaults,
  yAxisDefaults,
  cartesianGridDefaults,
  horizontalBarDefaults,
  chartAnimationDefaults,
} from "@/lib/chart-theme";

export function SubscriberImpact() {
  const { data: summary } = useSubscriberImpact();
  const { lookup: companyLookup } = useAllVideoCompanies();

  if (!summary || summary.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No subscriber impact data yet. Sync YouTube Analytics to see which videos drive the most subscriptions.
        </p>
      </div>
    );
  }

  const top10 = summary.items.slice(0, 10);
  const chartData = top10.map((item) => ({
    title: item.title.length > 35 ? item.title.slice(0, 35) + "..." : item.title,
    netSubs: item.netSubscribers,
    fullTitle: item.title,
  }));

  const scatterData = summary.items
    .filter((i) => i.views >= 100)
    .map((i) => ({
      title: i.title,
      views: i.views,
      subs: i.netSubscribers,
    }));

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox
          label="Total Net Subs"
          value={`+${fmtCount(summary.totalNetSubs)}`}
          icon={<Users className="w-4 h-4 text-green-500" />}
        />
        <KpiBox
          label="Avg Conversion Rate"
          value={`${summary.avgSubConversionRate.toFixed(3)}%`}
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
        />
        <KpiBox
          label="Top Sub Magnet"
          value={summary.topSubMagnet ? `+${fmtCount(summary.topSubMagnet.netSubscribers)}` : "—"}
          subtitle={summary.topSubMagnet?.title.slice(0, 25)}
          icon={<Award className="w-4 h-4 text-amber-500" />}
        />
        <KpiBox
          label="Best Converter"
          value={summary.bestConverter ? `${summary.bestConverter.subConversionRate.toFixed(3)}%` : "—"}
          subtitle={summary.bestConverter?.title.slice(0, 25)}
          icon={<Target className="w-4 h-4 text-purple-500" />}
        />
      </div>

      {/* Top 10 bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Videos by Net Subscribers</h3>
          <ResponsiveContainer width="100%" height={chartData.length * 35 + 40}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis type="number" {...xAxisDefaults} />
              <YAxis type="category" dataKey="title" {...yAxisDefaults} width={220} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [v.toLocaleString(), "Net Subs"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle ?? ""}
              />
              <Bar dataKey="netSubs" {...horizontalBarDefaults} {...chartAnimationDefaults}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.netSubs >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scatter plot */}
      {scatterData.length > 2 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Views vs Subscribers</h3>
          <p className="text-xs text-muted-foreground mb-3">Outliers above the trend line convert unusually well</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="views" name="Views" {...xAxisDefaults} tickFormatter={fmtCount} />
              <YAxis dataKey="subs" name="Net Subs" {...yAxisDefaults} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Scatter data={scatterData} fill="#22c55e" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Videos — Subscriber Impact</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Video</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Views</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Net Subs</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Conversion %</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">vs Avg</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.slice(0, 25).map((item) => {
                const vsAvg = summary.avgSubConversionRate > 0
                  ? ((item.subConversionRate - summary.avgSubConversionRate) / summary.avgSubConversionRate) * 100
                  : 0;
                return (
                  <tr key={item.youtubeVideoId} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-2 text-foreground max-w-[200px]">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{item.title}</span>
                        <VideoCompanyLogos companies={companyLookup.get(item.youtubeVideoId)} />
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmtCount(item.views)}</td>
                    <td className={`py-2 px-2 text-right font-mono font-semibold ${item.netSubscribers >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {item.netSubscribers >= 0 ? "+" : ""}{item.netSubscribers}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">{item.subConversionRate.toFixed(3)}%</td>
                    <td className={`py-2 px-2 text-right font-mono text-xs ${vsAvg >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {vsAvg >= 0 ? "+" : ""}{vsAvg.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, subtitle, icon }: { label: string; value: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
  );
}
