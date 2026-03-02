import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { subDays, format, startOfDay } from "date-fns";

export interface WeeklyRevenueSummary {
  thisWeekAdRevenue: number;
  lastWeekAdRevenue: number;
  thisWeekDealRevenue: number;
  lastWeekDealRevenue: number;
  thisWeekAffiliateRevenue: number;
  lastWeekAffiliateRevenue: number;
  totalThisWeek: number;
  totalLastWeek: number;
  weekOverWeekChange: number;
  dailyRevenue: Array<{ date: string; ad: number; deal: number; affiliate: number; total: number }>;
  topEarningVideo: { title: string; revenue: number } | null;
  bestDay: { date: string; revenue: number } | null;
}

export function useWeeklyRevenue() {
  const { workspaceId } = useWorkspace();

  const now = new Date();
  const thisWeekStart = format(subDays(now, 7), "yyyy-MM-dd");
  const lastWeekStart = format(subDays(now, 14), "yyyy-MM-dd");
  const lastWeekEnd = format(subDays(now, 7), "yyyy-MM-dd");

  const { data: adData = [], isLoading: adLoading } = useQuery({
    queryKey: ["weekly-revenue-ad", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("date, estimated_revenue, title, youtube_video_id")
        .eq("workspace_id", workspaceId!)
        .gte("date", lastWeekStart)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: dealData = [], isLoading: dealLoading } = useQuery({
    queryKey: ["weekly-revenue-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, closed_at")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "closed_won")
        .is("deleted_at", null)
        .gte("closed_at", lastWeekStart);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: affiliateData = [], isLoading: affLoading } = useQuery({
    queryKey: ["weekly-revenue-affiliate", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("amount, transaction_date")
        .eq("workspace_id", workspaceId!)
        .gte("transaction_date", lastWeekStart);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const summary = useMemo((): WeeklyRevenueSummary | null => {
    const isThisWeek = (dateStr: string) => dateStr >= thisWeekStart;
    const isLastWeek = (dateStr: string) => dateStr >= lastWeekStart && dateStr < lastWeekEnd;

    // Ad revenue
    const thisWeekAd = adData.filter((d: any) => isThisWeek(d.date));
    const lastWeekAd = adData.filter((d: any) => isLastWeek(d.date));
    const thisWeekAdRevenue = thisWeekAd.reduce((s: number, d: any) => s + (Number(d.estimated_revenue) || 0), 0);
    const lastWeekAdRevenue = lastWeekAd.reduce((s: number, d: any) => s + (Number(d.estimated_revenue) || 0), 0);

    // Deal revenue
    const thisWeekDealRevenue = dealData
      .filter((d: any) => d.closed_at && isThisWeek(d.closed_at.slice(0, 10)))
      .reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);
    const lastWeekDealRevenue = dealData
      .filter((d: any) => d.closed_at && isLastWeek(d.closed_at.slice(0, 10)))
      .reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);

    // Affiliate revenue
    const thisWeekAffiliateRevenue = affiliateData
      .filter((t: any) => t.transaction_date && isThisWeek(t.transaction_date))
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const lastWeekAffiliateRevenue = affiliateData
      .filter((t: any) => t.transaction_date && isLastWeek(t.transaction_date))
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

    const totalThisWeek = thisWeekAdRevenue + thisWeekDealRevenue + thisWeekAffiliateRevenue;
    const totalLastWeek = lastWeekAdRevenue + lastWeekDealRevenue + lastWeekAffiliateRevenue;
    const weekOverWeekChange = totalLastWeek > 0 ? ((totalThisWeek - totalLastWeek) / totalLastWeek) * 100 : 0;

    // Daily breakdown (this week)
    const dailyMap = new Map<string, { ad: number; deal: number; affiliate: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      dailyMap.set(d, { ad: 0, deal: 0, affiliate: 0 });
    }

    for (const row of thisWeekAd) {
      const entry = dailyMap.get(row.date);
      if (entry) entry.ad += Number(row.estimated_revenue) || 0;
    }
    for (const row of dealData) {
      if (row.closed_at) {
        const d = row.closed_at.slice(0, 10);
        const entry = dailyMap.get(d);
        if (entry) entry.deal += Number(row.value) || 0;
      }
    }
    for (const row of affiliateData) {
      if (row.transaction_date) {
        const entry = dailyMap.get(row.transaction_date);
        if (entry) entry.affiliate += Number(row.amount) || 0;
      }
    }

    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, vals]) => ({
      date: format(new Date(date), "EEE"),
      ad: vals.ad,
      deal: vals.deal,
      affiliate: vals.affiliate,
      total: vals.ad + vals.deal + vals.affiliate,
    }));

    const bestDay = dailyRevenue.reduce<{ date: string; revenue: number } | null>((best, d) => {
      if (!best || d.total > best.revenue) return { date: d.date, revenue: d.total };
      return best;
    }, null);

    // Top earning video this week
    const videoRevMap = new Map<string, { title: string; revenue: number }>();
    for (const row of thisWeekAd) {
      const existing = videoRevMap.get(row.youtube_video_id) ?? { title: row.title, revenue: 0 };
      existing.revenue += Number(row.estimated_revenue) || 0;
      videoRevMap.set(row.youtube_video_id, existing);
    }
    const topEarningVideo = Array.from(videoRevMap.values()).sort((a, b) => b.revenue - a.revenue)[0] ?? null;

    return {
      thisWeekAdRevenue,
      lastWeekAdRevenue,
      thisWeekDealRevenue,
      lastWeekDealRevenue,
      thisWeekAffiliateRevenue,
      lastWeekAffiliateRevenue,
      totalThisWeek,
      totalLastWeek,
      weekOverWeekChange,
      dailyRevenue,
      topEarningVideo,
      bestDay,
    };
  }, [adData, dealData, affiliateData, thisWeekStart, lastWeekStart, lastWeekEnd]);

  return { data: summary, isLoading: adLoading || dealLoading || affLoading };
}
