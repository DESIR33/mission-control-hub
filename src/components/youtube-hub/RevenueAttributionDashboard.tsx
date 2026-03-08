import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp } from "lucide-react";
import { useRevenueAttribution } from "@/hooks/use-revenue-attribution";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function RevenueAttributionDashboard() {
  const { data: attribution, isLoading } = useRevenueAttribution();

  const totalAd = attribution.reduce((s, v) => s + v.ad_revenue, 0);
  const totalSponsor = attribution.reduce((s, v) => s + v.sponsor_revenue, 0);
  const totalAll = totalAd + totalSponsor;

  const chartData = attribution.slice(0, 10).map((v) => ({
    title: v.video_title.length > 25 ? v.video_title.substring(0, 25) + "…" : v.video_title,
    ad: Math.round(v.ad_revenue),
    sponsor: Math.round(v.sponsor_revenue),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-500" />
          Revenue Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalAll)}</p>
            <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/5">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalAd)}</p>
            <p className="text-[10px] text-muted-foreground">Ad Revenue</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/5">
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalSponsor)}</p>
            <p className="text-[10px] text-muted-foreground">Sponsor Revenue</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 9 }} width={120} />
                <Tooltip formatter={(v: number) => [`$${v}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ad" name="Ad Revenue" fill="hsl(217, 91%, 60%)" stackId="rev" radius={[0, 2, 2, 0]} />
                <Bar dataKey="sponsor" name="Sponsor" fill="hsl(160, 84%, 39%)" stackId="rev" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top videos by RPM */}
        <div>
          <p className="text-xs font-medium text-foreground mb-1">Top Videos by RPM</p>
          <div className="space-y-1">
            {attribution.slice(0, 5).map((v) => (
              <div key={v.youtube_video_id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <span className="truncate flex-1 mr-2 text-foreground">{v.video_title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">{formatCurrency(v.total_revenue)}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    ${v.rpm.toFixed(2)} RPM
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {attribution.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No revenue data available. Link sponsors to videos and sync YouTube analytics.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
