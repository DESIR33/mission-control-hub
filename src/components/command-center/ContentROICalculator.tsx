import { useContentROI } from "@/hooks/use-content-roi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Calculator } from "lucide-react";

const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function ContentROICalculator() {
  const { data: summary, isLoading } = useContentROI();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No ROI data yet. Add production costs to your videos in the Video Queue to see ROI calculations.
        </p>
      </div>
    );
  }

  const chartData = summary.items.slice(0, 15).map((item) => ({
    title: item.videoTitle.length > 30 ? item.videoTitle.slice(0, 30) + "..." : item.videoTitle,
    profit: Number(item.profit.toFixed(0)),
    fullTitle: item.videoTitle,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox label="Total Invested" value={fmtMoney(summary.totalInvested)} icon={<DollarSign className="w-4 h-4 text-blue-500" />} />
        <KpiBox label="Total Revenue" value={fmtMoney(summary.totalRevenue)} icon={<DollarSign className="w-4 h-4 text-green-500" />} />
        <KpiBox
          label="Total Profit"
          value={fmtMoney(summary.totalProfit)}
          icon={summary.totalProfit >= 0
            ? <TrendingUp className="w-4 h-4 text-green-500" />
            : <TrendingDown className="w-4 h-4 text-red-500" />
          }
          valueClass={summary.totalProfit >= 0 ? "text-green-500" : "text-red-500"}
        />
        <KpiBox label="Avg ROI" value={`${summary.avgROI.toFixed(0)}%`} icon={<Calculator className="w-4 h-4 text-purple-500" />} />
      </div>

      {/* Profit Bar Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Profit per Video</h3>
          <ResponsiveContainer width="100%" height={chartData.length * 35 + 40}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtMoney} />
              <YAxis type="category" dataKey="title" tick={{ fontSize: 10 }} width={200} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [fmtMoney(v), "Profit"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle ?? ""}
              />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ROI Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Video ROI Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Video</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Profit</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">ROI %</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Break-even Views</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.map((item) => (
                <tr key={item.videoQueueId} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-2 text-foreground truncate max-w-[200px]">{item.videoTitle}</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{fmtMoney(item.productionCost)}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{fmtMoney(item.totalRevenue)}</td>
                  <td className={`py-2 px-2 text-right font-mono font-semibold ${item.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {fmtMoney(item.profit)}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono font-semibold ${item.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {item.roi.toFixed(0)}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {item.breakEvenViews > 0 ? item.breakEvenViews.toLocaleString() : "—"}
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

function KpiBox({ label, value, icon, valueClass }: { label: string; value: string; icon: React.ReactNode; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${valueClass ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
