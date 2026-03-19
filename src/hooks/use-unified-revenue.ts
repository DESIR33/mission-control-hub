import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { subMonths, startOfMonth, format } from "date-fns";
import { getDealAttributionDate } from "@/lib/deal-date-utils";

export interface MonthlyRevenue {
  month: string;
  monthKey: string;
  sponsors: number;
  affiliates: number;
  adSense: number;
  products: number;
  total: number;
}

export interface UnifiedRevenueData {
  monthly: MonthlyRevenue[];
  totalRevenue: number;
  sponsorTotal: number;
  affiliateTotal: number;
  adSenseTotal: number;
  productTotal: number;
  revenuePerSub: number;
  revenuePerThousandSubs: number;
  revenuePerVideo: number;
  momGrowth: number;
  projectedAnnual: number;
}

export function useUnifiedRevenue(monthCount: number = 12) {
  const { workspaceId } = useWorkspace();

  const { data: wonDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["unified-rev-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, closed_at, created_at, notes")
        .eq("workspace_id", workspaceId!)
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

  const { data: manualAdRevenue = [] } = useQuery({
    queryKey: ["unified-rev-manual-adsense", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_adsense_revenue" as any)
        .select("month, amount")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: productTx = [] } = useQuery({
    queryKey: ["unified-rev-products", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_transactions" as any)
        .select("total_amount, net_amount, transaction_date")
        .eq("workspace_id", workspaceId!);
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
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const revenue = useMemo((): UnifiedRevenueData | null => {
    const monthly: MonthlyRevenue[] = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(new Date(), i));
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM yy");

      let sponsors = 0;
      for (const d of wonDeals) {
        const dealDate = getDealAttributionDate(d);
        if (dealDate?.startsWith(monthStr)) sponsors += d.value || 0;
      }

      let affiliates = 0;
      for (const t of affiliateTx) {
        if (t.transaction_date?.startsWith(monthStr)) affiliates += t.amount || 0;
      }

      let adSense = 0;
      for (const r of adRevenue) {
        if (r.date?.startsWith(monthStr)) adSense += Number(r.estimated_revenue) || 0;
      }
      if (adSense === 0) {
        const manual = manualAdRevenue.find((m: any) => m.month === monthStr);
        if (manual) adSense = Number(manual.amount) || 0;
      }

      let products = 0;
      for (const tx of productTx) {
        if (tx.transaction_date?.startsWith(monthStr)) {
          products += Number(tx.net_amount || tx.sale_price) || 0;
        }
      }

      monthly.push({
        month: monthLabel,
        monthKey: monthStr,
        sponsors,
        affiliates,
        adSense: Math.round(adSense * 100) / 100,
        products,
        total: sponsors + affiliates + adSense + products,
      });
    }

    // AdSense totals (API + manual fallback)
    const apiAdByMonth = new Map<string, number>();
    for (const r of adRevenue) {
      const m = r.date?.substring(0, 7);
      if (m) apiAdByMonth.set(m, (apiAdByMonth.get(m) || 0) + (Number(r.estimated_revenue) || 0));
    }
    let adSenseTotal = 0;
    for (const [, v] of apiAdByMonth) adSenseTotal += v;
    for (const m of manualAdRevenue) {
      if (!apiAdByMonth.has(m.month) || (apiAdByMonth.get(m.month) || 0) === 0) {
        adSenseTotal += Number(m.amount) || 0;
      }
    }

    const sponsorTotal = wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
    const affiliateTotal = affiliateTx.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const productTotal = productTx.reduce((s: number, tx: any) => s + (Number(tx.net_amount || tx.sale_price) || 0), 0);
    const totalRevenue = sponsorTotal + affiliateTotal + adSenseTotal + productTotal;

    const subscriberCount = channelStats?.subscriber_count || 0;
    const videoCount = channelStats?.video_count || 1;
    const revenuePerSub = subscriberCount > 0 ? totalRevenue / subscriberCount : 0;
    const revenuePerThousandSubs = subscriberCount > 0 ? totalRevenue / (subscriberCount / 1000) : 0;
    const revenuePerVideo = totalRevenue / videoCount;

    const lastMonth = monthly[monthly.length - 1]?.total || 0;
    const prevMonth = monthly[monthly.length - 2]?.total || 0;
    const momGrowth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

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
      productTotal,
      revenuePerSub: Math.round(revenuePerSub * 100) / 100,
      revenuePerThousandSubs: Math.round(revenuePerThousandSubs * 100) / 100,
      revenuePerVideo: Math.round(revenuePerVideo),
      momGrowth: Math.round(momGrowth),
      projectedAnnual: Math.round(projectedAnnual),
    };
  }, [monthCount, wonDeals, affiliateTx, adRevenue, manualAdRevenue, productTx, channelStats]);

  return { data: revenue, isLoading: dealsLoading };
}
