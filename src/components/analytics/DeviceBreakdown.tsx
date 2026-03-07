import { useMemo } from "react";
import { Monitor, Smartphone, Tablet, Tv, Gamepad2 } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DeviceType } from "@/hooks/use-youtube-analytics-api";
import { fmtCount, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, barDefaults } from "@/lib/chart-theme";

const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  TABLET: "Tablet",
  TV: "TV",
  GAME_CONSOLE: "Console",
  UNKNOWN: "Unknown",
};

const DEVICE_COLORS: Record<string, string> = {
  DESKTOP: "#3b82f6",
  MOBILE: "#22c55e",
  TABLET: "#f59e0b",
  TV: "#8b5cf6",
  GAME_CONSOLE: "#ef4444",
  UNKNOWN: "#9ca3af",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  DESKTOP: <Monitor className="w-5 h-5" />,
  MOBILE: <Smartphone className="w-5 h-5" />,
  TABLET: <Tablet className="w-5 h-5" />,
  TV: <Tv className="w-5 h-5" />,
  GAME_CONSOLE: <Gamepad2 className="w-5 h-5" />,
};

interface Props {
  data: DeviceType[];
}

export function DeviceBreakdown({ data }: Props) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.views - a.views),
    [data]
  );

  const totalViews = useMemo(() => sorted.reduce((s, d) => s + d.views, 0), [sorted]);
  const totalWatchTime = useMemo(() => sorted.reduce((s, d) => s + d.estimated_minutes_watched, 0), [sorted]);

  const chartData = useMemo(
    () =>
      sorted.map((d) => ({
        device: DEVICE_LABELS[d.device_type] ?? d.device_type,
        deviceType: d.device_type,
        views: d.views,
        watchTime: Math.round(d.estimated_minutes_watched / 60),
        pct: totalViews > 0 ? +((d.views / totalViews) * 100).toFixed(1) : 0,
        watchPct: totalWatchTime > 0 ? +((d.estimated_minutes_watched / totalWatchTime) * 100).toFixed(1) : 0,
        color: DEVICE_COLORS[d.device_type] ?? "#9ca3af",
      })),
    [sorted, totalViews, totalWatchTime]
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Monitor className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No device data available. Sync YouTube Analytics to see what devices your viewers use.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Device Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {chartData.map((d) => (
          <div
            key={d.deviceType}
            className="rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-card/80"
          >
            <div className="flex justify-center mb-2" style={{ color: d.color }}>
              {DEVICE_ICONS[d.deviceType] ?? <Monitor className="w-5 h-5" />}
            </div>
            <p className="text-xs text-muted-foreground font-medium">{d.device}</p>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{d.pct}%</p>
            <p className="text-xs text-muted-foreground">{fmtCount(d.views)} views</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Views by Device</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="views"
                strokeWidth={0}
                animationDuration={800}
                label={({ device, pct }) => `${device}: ${pct}%`}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [v.toLocaleString(), "Views"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Watch time bar chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Watch Time by Device (hours)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="device" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}h`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v}h`, "Watch Time"]}
              />
              <Bar dataKey="watchTime" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight callout */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Device Insights</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{chartData[0].pct}%</span> of your views come from{" "}
            <span className="font-semibold text-foreground">{chartData[0].device}</span> devices.
            {chartData.length > 1 && chartData[0].watchPct !== chartData[0].pct && (
              <> However, {chartData[0].device} accounts for <span className="font-semibold text-foreground">{chartData[0].watchPct}%</span> of watch time{" "}
                {chartData[0].watchPct > chartData[0].pct
                  ? "— viewers watch longer on this device."
                  : "— viewers tend to watch shorter sessions here."}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
