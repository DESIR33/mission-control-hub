import {
  DollarSign, TrendingUp, TrendingDown, Calendar,
  ArrowUpRight, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BudgetCard } from "@/components/ui/analytics-bento";
import { useRevenueForecast } from "@/hooks/use-revenue-forecast";
import { fmtMoney } from "@/lib/chart-theme";

export function RevenueForecast() {
  const { data: forecast, isLoading } = useRevenueForecast();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!forecast) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No revenue data available for forecasting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Rev</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(forecast.currentMonthlyRevenue)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Projected</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(forecast.projectedMonthlyRevenue)}</p>
          <p className="text-xs text-muted-foreground">next month</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Annual</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(forecast.projectedAnnualRevenue)}</p>
          <p className="text-xs text-muted-foreground">projected</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {forecast.monthlyGrowthRate >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MoM Growth</p>
          </div>
          <p className={`text-lg font-bold font-mono ${forecast.monthlyGrowthRate >= 0 ? "text-green-400" : "text-red-400"}`}>
            {forecast.monthlyGrowthRate >= 0 ? "+" : ""}{forecast.monthlyGrowthRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Insights */}
      {forecast.insights.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {forecast.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <ArrowUpRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Revenue Forecast Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">90-Day Revenue Forecast</h3>
        <BudgetCard />
      </div>

      {/* RPM Trend */}
      {forecast.rpmTrend.length > 5 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            RPM Trend (Revenue per 1,000 views) · Avg ${forecast.avgRpm.toFixed(2)}
          </h3>
          <BudgetCard />
        </div>
      )}

      {/* Revenue Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Breakdown</h3>
        <div className="space-y-3">
          {forecast.breakdown.map((b) => (
            <div key={b.source} className="flex items-center gap-3">
              <p className="text-sm text-foreground w-32">{b.source}</p>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                  <span>Current: {fmtMoney(b.current)}</span>
                  <span>Projected: {fmtMoney(b.projected)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${forecast.breakdown[0]?.current > 0 ? (b.current / forecast.breakdown[0].current) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
