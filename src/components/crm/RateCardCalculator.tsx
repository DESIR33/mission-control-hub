import { useState } from "react";
import {
  DollarSign, Calculator, TrendingUp, TrendingDown, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useRateCard } from "@/hooks/use-rate-card";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const fmtDollar = (n: number) => `$${n.toLocaleString()}`;

export function RateCardCalculator() {
  const { data: rateCard, isLoading } = useRateCard();
  const [offerAmount, setOfferAmount] = useState<string>("");

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!rateCard) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No channel data available for rate card calculation.</p>
      </div>
    );
  }

  const offer = parseFloat(offerAmount) || 0;
  const integratedRate = rateCard.rates.find((r) => r.type === "Integrated Mention")?.suggestedRate ?? 0;
  const offerVsMarket = integratedRate > 0 ? ((offer - integratedRate) / integratedRate) * 100 : 0;

  const chartData = rateCard.rates.map((r) => ({
    name: r.type,
    suggested: r.suggestedRate,
    historical: r.avgHistoricalDeal,
  }));

  return (
    <div className="space-y-4">
      {/* Undercharging Alert */}
      {rateCard.isUndercharging && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">You may be undercharging</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your average deal ({fmtDollar(rateCard.avgDealValue)}) is below the suggested integrated mention rate ({fmtDollar(integratedRate)}).
            </p>
          </div>
        </div>
      )}

      {/* Channel Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subscribers</p>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(rateCard.subscriberCount)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Views</p>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(rateCard.avgViews)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Engagement</p>
          <p className="text-lg font-bold font-mono text-foreground">{rateCard.engagementRate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Niche Multiplier</p>
          <p className="text-lg font-bold font-mono text-foreground">{rateCard.nicheMultiplier}x</p>
          <p className="text-xs text-muted-foreground">Tech/Business</p>
        </div>
      </div>

      {/* Rate Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">Integration Type</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">Suggested Rate</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Your Avg Deal</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rateCard.rates.map((rate) => (
              <tr key={rate.type}>
                <td className="px-4 py-2.5">
                  <p className="text-xs font-medium text-foreground">{rate.type}</p>
                  <p className="text-xs text-muted-foreground">{rate.description}</p>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <p className="text-sm font-bold font-mono text-foreground">{fmtDollar(rate.suggestedRate)}</p>
                </td>
                <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                  <p className="text-xs font-mono text-muted-foreground">
                    {rateCard.avgDealValue > 0 ? fmtDollar(rate.avgHistoricalDeal) : "—"}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                  {rateCard.avgDealValue > 0 ? (
                    <span className={`text-xs font-mono ${rate.delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {rate.delta >= 0 ? "+" : ""}{rate.delta}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Negotiation Calculator */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          Negotiation Calculator
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Sponsor's Offer</label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="number"
                className="w-full bg-muted/50 rounded px-3 pl-7 py-2 text-sm text-foreground border border-border outline-none"
                placeholder="0"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
              />
            </div>
          </div>
          {offer > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">vs Market Rate</p>
              <p className={`text-lg font-bold font-mono ${offerVsMarket >= 0 ? "text-green-400" : "text-red-400"}`}>
                {offerVsMarket >= 0 ? "+" : ""}{offerVsMarket.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {offerVsMarket >= 0 ? "above" : "below"} suggested rate
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Chart */}
      {rateCard.avgDealValue > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Suggested vs Historical Rates</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtDollar(v)} />
              <Bar dataKey="suggested" fill="#3b82f6" name="Suggested" radius={[4, 4, 0, 0]} />
              <Bar dataKey="historical" fill="#22c55e" name="Your Avg" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
