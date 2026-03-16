import {
  DollarSign, TrendingUp, TrendingDown, Calendar,
  ArrowUpRight, BarChart3, Lightbulb, CreditCard,
} from "lucide-react";
import { BudgetCard } from "@/components/ui/analytics-bento";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueForecast } from "@/hooks/use-revenue-forecast";
import { useRateCard } from "@/hooks/use-rate-card";
import {
  fmtMoney,
} from "@/lib/chart-theme";

export function RevenueIntelligence() {
  const { data: forecast, isLoading: forecastLoading } = useRevenueForecast();
  const { items: rateCardItems, isLoading: rateCardLoading } = useRateCard();

  const isLoading = forecastLoading || rateCardLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No revenue data available for forecasting.</p>
            <p className="text-xs mt-1">
              Connect your YouTube channel to see revenue insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Revenue Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Row: Current vs Projected */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Monthly Rev
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {fmtMoney(forecast.currentMonthlyRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">current</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Projected
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {fmtMoney(forecast.projectedMonthlyRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">next month</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Annual
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {fmtMoney(forecast.projectedAnnualRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">projected</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              {forecast.monthlyGrowthRate >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                MoM Growth
              </p>
            </div>
            <p
              className={`text-lg font-bold font-mono ${
                forecast.monthlyGrowthRate >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {forecast.monthlyGrowthRate >= 0 ? "+" : ""}
              {forecast.monthlyGrowthRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 3-Scenario Forecast Chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            90-Day Revenue Forecast (3 Scenarios)
          </h3>
          <BudgetCard />
        </div>

        {/* Revenue Breakdown by Source */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            Revenue Breakdown by Source
          </h3>
          <div className="space-y-3">
            {forecast.breakdown.map((b) => {
              const maxCurrent = Math.max(
                ...forecast.breakdown.map((br) => br.current),
                1
              );
              const widthPercent =
                maxCurrent > 0 ? (b.current / maxCurrent) * 100 : 0;
              return (
                <div key={b.source} className="flex items-center gap-3">
                  <p className="text-sm text-foreground w-36">{b.source}</p>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                      <span>Current: {fmtMoney(b.current)}</span>
                      <span>Projected: {fmtMoney(b.projected)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rate Card Section */}
        {rateCardItems.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-purple-500" />
              Rate Card
            </h3>
            <div className="space-y-2">
              {rateCardItems.filter(i => i.is_active).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-foreground">
                      {item.price > 0 ? fmtMoney(item.price) : "Included"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RPM Trend */}
        {forecast.rpmTrend.length > 5 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              RPM Trend (Revenue per 1,000 views) &middot; Avg $
              {forecast.avgRpm.toFixed(2)}
            </h3>
            <BudgetCard />
          </div>
        )}

        {/* AI Insights */}
        {forecast.insights.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              AI Insights
            </h3>
            <ul className="space-y-1">
              {forecast.insights.map((insight, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <ArrowUpRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
