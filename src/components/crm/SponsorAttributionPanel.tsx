import { useState } from "react";
import { useSponsorAttribution } from "@/hooks/use-sponsor-attribution";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function SponsorAttributionPanel() {
  const { data: summary, isLoading } = useSponsorAttribution();
  const [expandedSponsor, setExpandedSponsor] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!summary || summary.sponsors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No sponsor attribution data yet. Link deals to videos to see sponsor performance.
        </p>
      </div>
    );
  }

  const chartData = summary.sponsors.slice(0, 10).map((s) => ({
    name: s.companyName.length > 20 ? s.companyName.slice(0, 20) + "..." : s.companyName,
    value: s.totalDealValue,
    fullName: s.companyName,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Sponsor Revenue</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(summary.totalSponsorRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Sponsors</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{summary.sponsors.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Deal Size</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(summary.avgDealSize)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Repeat Rate</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{summary.sponsorRetentionRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Sponsors by Revenue</h3>
          <ResponsiveContainer width="100%" height={chartData.length * 35 + 40}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtMoney} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [fmtMoney(v), "Deal Value"]}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sponsors Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Sponsors</h3>
        <div className="space-y-1">
          {summary.sponsors.map((sponsor) => {
            const key = sponsor.companyId || sponsor.contactId || sponsor.companyName;
            const isExpanded = expandedSponsor === key;
            return (
              <div key={key} className="border-b border-border/50">
                <button
                  onClick={() => setExpandedSponsor(isExpanded ? null : key)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/20 rounded transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{sponsor.companyName}</p>
                    <p className="text-xs text-muted-foreground">{sponsor.contactName} · {sponsor.videosSponsored} video{sponsor.videosSponsored !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-green-500">{fmtMoney(sponsor.totalDealValue)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {sponsor.videoLinks.map((vl, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <span className="text-foreground truncate max-w-[200px]">{vl.videoTitle}</span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>Deal: {fmtMoney(vl.dealValue)}</span>
                          <span>Revenue: {fmtMoney(vl.videoRevenue)}</span>
                        </div>
                      </div>
                    ))}
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
