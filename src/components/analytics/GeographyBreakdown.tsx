import { useMemo } from "react";
import { Globe } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Geography } from "@/hooks/use-youtube-analytics-api";
import { fmtCount, fmtDuration, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, horizontalBarDefaults } from "@/lib/chart-theme";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", IN: "India", BR: "Brazil", JP: "Japan",
  KR: "South Korea", MX: "Mexico", ES: "Spain", IT: "Italy", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  RU: "Russia", CN: "China", TW: "Taiwan", PH: "Philippines", ID: "Indonesia",
  TH: "Thailand", VN: "Vietnam", MY: "Malaysia", SG: "Singapore", NZ: "New Zealand",
  ZA: "South Africa", NG: "Nigeria", EG: "Egypt", AE: "UAE", SA: "Saudi Arabia",
  TR: "Turkey", AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru",
  PT: "Portugal", IE: "Ireland", AT: "Austria", CH: "Switzerland", BE: "Belgium",
  CZ: "Czech Republic", RO: "Romania", HU: "Hungary", GR: "Greece", IL: "Israel",
  PK: "Pakistan", BD: "Bangladesh", UA: "Ukraine", KE: "Kenya", GH: "Ghana",
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷",
  IN: "🇮🇳", BR: "🇧🇷", JP: "🇯🇵", KR: "🇰🇷", MX: "🇲🇽", ES: "🇪🇸",
  IT: "🇮🇹", NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", PL: "🇵🇱", RU: "🇷🇺",
  CN: "🇨🇳", PH: "🇵🇭", ID: "🇮🇩", TH: "🇹🇭", VN: "🇻🇳", SG: "🇸🇬",
  NZ: "🇳🇿", ZA: "🇿🇦", NG: "🇳🇬", AE: "🇦🇪", TR: "🇹🇷", AR: "🇦🇷",
  PT: "🇵🇹", IE: "🇮🇪", CH: "🇨🇭", IL: "🇮🇱", PK: "🇵🇰", UA: "🇺🇦",
  TW: "🇹🇼", MY: "🇲🇾", SA: "🇸🇦", EG: "🇪🇬", CO: "🇨🇴", CL: "🇨🇱",
};


interface Props {
  data: Geography[];
}

export function GeographyBreakdown({ data }: Props) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.views - a.views),
    [data]
  );

  const totalViews = useMemo(() => sorted.reduce((s, d) => s + d.views, 0), [sorted]);

  const chartData = useMemo(
    () =>
      sorted.slice(0, 15).map((d) => ({
        country: COUNTRY_NAMES[d.country] ?? d.country,
        code: d.country,
        flag: COUNTRY_FLAGS[d.country] ?? "",
        views: d.views,
        watchTime: Math.round(d.estimated_minutes_watched / 60),
        avgDuration: d.average_view_duration_seconds,
        subsGained: d.subscribers_gained,
        pct: totalViews > 0 ? +((d.views / totalViews) * 100).toFixed(1) : 0,
      })),
    [sorted, totalViews]
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No geography data available. Sync YouTube Analytics to see where your viewers are located.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top countries summary */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Geographic Reach</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your viewers span <span className="font-semibold text-foreground">{sorted.length} countries</span>.
            Top markets: {chartData.slice(0, 3).map((d, i) => (
              <span key={d.code}>
                {i > 0 && ", "}
                <span className="font-semibold text-foreground">{d.flag} {d.country}</span> ({d.pct}%)
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Top 15 countries bar chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top Countries by Views</h3>
        <ResponsiveContainer width="100%" height={Math.max(chartData.length * 32, 200)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis type="number" {...xAxisDefaults} tickFormatter={fmtCount} />
            <YAxis type="category" dataKey="country" {...yAxisDefaults} width={130} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => {
                if (name === "views") return [v.toLocaleString(), "Views"];
                return [v, name];
              }}
            />
            <Bar dataKey="views" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={32} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Country data table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Country Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Country</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Views</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">%</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Watch Time</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Avg Duration</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Subs Gained</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={row.code} className="border-b border-border/50">
                  <td className="py-2 px-2 text-muted-foreground font-mono">{i + 1}</td>
                  <td className="py-2 px-2 font-medium text-foreground">
                    {row.flag} {row.country}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.views.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.pct}%</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{row.watchTime}h</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmtDuration(row.avgDuration)}</td>
                  <td className="py-2 px-2 text-right font-mono text-green-500">+{row.subsGained}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
