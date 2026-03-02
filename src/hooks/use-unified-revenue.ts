import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { subMonths, startOfMonth, format } from "date-fns";

export interface MonthlyRevenue {
  month: string;
  sponsors: number;
  affiliates: number;
  adSense: number;
  total: number;
}

export interface UnifiedRevenueData {
  monthly: MonthlyRevenue[];
  totalRevenue: number;
  sponsorTotal: number;
  affiliateTotal: number;
  adSenseTotal: number;
  revenuePerSub: number;
  revenuePerVideo: number;
  momGrowth: number; // month over month %
  projectedAnnual: number;
}

export function useUnifiedRevenue() {
  const { workspaceId } = useWorkspace();

  const { data: wonDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["unified-rev-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, closed_at")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "closed_won")
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: affiliateTx = [] } = useQuery({
    queryKey: ["unified-rev-affiliates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("amount, transaction_date")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: adRevenue = [] } = useQuery({
    queryKey: ["unified-rev-adsense", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, estimated_revenue")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: channelStats } = useQuery({
    queryKey: ["unified-rev-channel", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("subscriber_count, video_count")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const revenue = useMemo((): UnifiedRevenueData | null => {
    const monthly: MonthlyRevenue[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(new Date(), i));
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM yy");

      let sponsors = 0;
      for (const d of wonDeals) {
        if (d.closed_at?.startsWith(monthStr)) sponsors += d.value || 0;
      }

      let affiliates = 0;
      for (const t of affiliateTx) {
        if (t.transaction_date?.startsWith(monthStr)) affiliates += t.amount || 0;
      }

      let adSense = 0;
      for (const r of adRevenue) {
        if (r.date?.startsWith(monthStr)) adSense += Number(r.estimated_revenue) || 0;
      }

      monthly.push({
        month: monthLabel,
        sponsors,
        affiliates,
        adSense: Math.round(adSense * 100) / 100,
        total: sponsors + affiliates + adSense,
      });
    }

    const sponsorTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const affiliateTotal = affiliateTx.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const adSenseTotal = adRevenue.reduce((s: number, r: any) => s + (Number(r.estimated_revenue) || 0), 0);
    const totalRevenue = sponsorTotal + affiliateTotal + adSenseTotal;

    const subscriberCount = channelStats?.subscriber_count || 1;
    const videoCount = channelStats?.video_count || 1;
    const revenuePerSub = totalRevenue / subscriberCount;
    const revenuePerVideo = totalRevenue / videoCount;

    // Month over month growth
    const lastMonth = monthly[monthly.length - 1]?.total || 0;
    const prevMonth = monthly[monthly.length - 2]?.total || 0;
    const momGrowth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    // Projected annual based on last 3 months avg
    const recentMonths = monthly.slice(-3);
    const recentAvg = recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.total, 0) / recentMonths.length
      : 0;
    const projectedAnnual = recentAvg * 12;

    return {
      monthly,
      totalRevenue,
      sponsorTotal,
      affiliateTotal,
      adSenseTotal: Math.round(adSenseTotal * 100) / 100,
      revenuePerSub: Math.round(revenuePerSub * 100) / 100,
      revenuePerVideo: Math.round(revenuePerVideo),
      momGrowth: Math.round(momGrowth),
      projectedAnnual: Math.round(projectedAnnual),
    };
  }, [wonDeals, affiliateTx, adRevenue, channelStats]);

  return { data: revenue, isLoading: dealsLoading };
}
