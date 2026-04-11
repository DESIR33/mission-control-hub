import { useMemo } from "react";
import { useChannelAnalytics, type ChannelAnalytics } from "@/hooks/use-youtube-analytics-api";
import { safeFormat } from "@/lib/date-utils";
import { subDays, addDays, format, differenceInDays } from "date-fns";

export interface RevenueForecastPoint {
  date: string;
  actual?: number;
  forecast?: number;
  optimistic?: number;
  conservative?: number;
}

export interface RevenueBreakdown {
  source: string;
  current: number;
  projected: number;
  growth: number;
}

export interface RevenueForecast {
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  projectedAnnualRevenue: number;
  dailyRate: number;
  monthlyGrowthRate: number;
  forecastPoints: RevenueForecastPoint[];
  breakdown: RevenueBreakdown[];
  rpmTrend: { date: string; rpm: number }[];
  avgRpm: number;
  insights: string[];
}

/** Computes revenue forecasts from channel analytics data. */
export function useRevenueForecast() {
  const { data: channelData = [], isLoading } = useChannelAnalytics(180);

  const forecast = useMemo((): RevenueForecast | null => {
    if (!channelData.length) return null;

    const sorted = [...channelData].sort((a, b) => a.date.localeCompare(b.date));

    // Split into months for monthly aggregation
    const monthlyRevenue = new Map<string, { revenue: number; adRevenue: number; redRevenue: number; views: number; days: number }>();
    sorted.forEach((d) => {
      const month = d.date.substring(0, 7);
      const existing = monthlyRevenue.get(month) ?? { revenue: 0, adRevenue: 0, redRevenue: 0, views: 0, days: 0 };
      existing.revenue += Number(d.estimated_revenue) || 0;
      existing.adRevenue += Number(d.estimated_ad_revenue) || 0;
      existing.redRevenue += Number(d.estimated_red_partner_revenue) || 0;
      existing.views += d.views;
      existing.days++;
      monthlyRevenue.set(month, existing);
    });

    const months = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (months.length < 1) return null;

    // Current month revenue (extrapolate if partial month)
    const latestMonth = months[months.length - 1];
    const daysInMonth = 30;
    const currentMonthlyRevenue = latestMonth[1].days > 0
      ? (latestMonth[1].revenue / latestMonth[1].days) * daysInMonth
      : 0;

    // Daily revenue rate from last 30 days
    const last30 = sorted.slice(-30);
    const dailyRate = last30.reduce((s, d) => s + (Number(d.estimated_revenue) || 0), 0) / Math.max(last30.length, 1);

    // Monthly growth rate
    let monthlyGrowthRate = 0;
    if (months.length >= 2) {
      const prevMonthRev = months[months.length - 2][1].revenue;
      const currMonthRev = latestMonth[1].revenue;
      if (prevMonthRev > 0) {
        monthlyGrowthRate = ((currMonthRev - prevMonthRev) / prevMonthRev) * 100;
      }
    }

    // Projected monthly (applying growth)
    const growthMultiplier = 1 + (monthlyGrowthRate / 100);
    const projectedMonthlyRevenue = currentMonthlyRevenue * growthMultiplier;
    const projectedAnnualRevenue = projectedMonthlyRevenue * 12;

    // Build forecast points
    const forecastPoints: RevenueForecastPoint[] = [];

    // Last 90 days actuals
    const last90 = sorted.slice(-90);
    let cumulative = 0;
    last90.forEach((d) => {
      cumulative += Number(d.estimated_revenue) || 0;
      forecastPoints.push({
        date: safeFormat(d.date, "MMM dd"),
        actual: Math.round(cumulative * 100) / 100,
      });
    });

    // 90 day forecast
    const baseCumulative = cumulative;
    for (let i = 1; i <= 90; i += 3) {
      const projected = baseCumulative + dailyRate * i;
      forecastPoints.push({
        date: format(addDays(new Date(), i), "MMM dd"),
        forecast: Math.round(projected * 100) / 100,
        optimistic: Math.round(projected * 1.25 * 100) / 100,
        conservative: Math.round(projected * 0.75 * 100) / 100,
      });
    }

    // Revenue breakdown
    const totalRevenue = sorted.reduce((s, d) => s + (Number(d.estimated_revenue) || 0), 0);
    const totalAdRevenue = sorted.reduce((s, d) => s + (Number(d.estimated_ad_revenue) || 0), 0);
    const totalRedRevenue = sorted.reduce((s, d) => s + (Number(d.estimated_red_partner_revenue) || 0), 0);
    const otherRevenue = totalRevenue - totalAdRevenue - totalRedRevenue;

    const breakdown: RevenueBreakdown[] = [
      { source: "Ad Revenue", current: totalAdRevenue, projected: totalAdRevenue * growthMultiplier, growth: monthlyGrowthRate },
      { source: "YouTube Premium", current: totalRedRevenue, projected: totalRedRevenue * growthMultiplier, growth: monthlyGrowthRate },
      { source: "Other", current: otherRevenue, projected: otherRevenue * growthMultiplier, growth: monthlyGrowthRate },
    ];

    // RPM trend
    const rpmTrend = sorted
      .filter((d) => d.views > 0)
      .map((d) => ({
        date: d.date,
        rpm: ((Number(d.estimated_revenue) || 0) / d.views) * 1000,
      }));

    const avgRpm = rpmTrend.length > 0
      ? rpmTrend.reduce((s, r) => s + r.rpm, 0) / rpmTrend.length
      : 0;

    // Insights
    const insights: string[] = [];
    if (monthlyGrowthRate > 10) {
      insights.push(`Revenue is growing ${monthlyGrowthRate.toFixed(1)}% month-over-month — strong trajectory!`);
    } else if (monthlyGrowthRate < -5) {
      insights.push(`Revenue declined ${Math.abs(monthlyGrowthRate).toFixed(1)}% — investigate CPM trends and view counts.`);
    }

    if (avgRpm > 5) {
      insights.push(`Your RPM of $${avgRpm.toFixed(2)} is above average — your niche monetizes well.`);
    }

    if (projectedAnnualRevenue > 0) {
      insights.push(`At current pace, projected annual YouTube ad revenue: $${projectedAnnualRevenue.toFixed(0)}.`);
    }

    return {
      currentMonthlyRevenue,
      projectedMonthlyRevenue,
      projectedAnnualRevenue,
      dailyRate,
      monthlyGrowthRate,
      forecastPoints,
      breakdown,
      rpmTrend,
      avgRpm,
      insights,
    };
  }, [channelData]);

  return { data: forecast, isLoading };
}
