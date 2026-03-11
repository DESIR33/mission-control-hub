import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { getDealAttributionDate } from "@/lib/deal-date-utils";

export interface RevenueGoal {
  id: string;
  workspace_id: string;
  metric: string;
  target_value: number;
  current_value: number;
  period: string;
  created_at: string;
}

export interface MonthlyRevenueByStream {
  month: string;
  sponsors: number;
  affiliates: number;
  ads: number;
  total: number;
}

export interface RPMDataPoint {
  month: string;
  rpm: number;
}

export interface PendingOpportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
}

export function useRevenueGoals() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  // Fetch revenue goal
  const goalQuery = useQuery({
    queryKey: ["revenue-goal", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("metric", "revenue")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as unknown as RevenueGoal | null;
    },
    enabled: !!workspaceId,
  });

  // Fetch affiliate transactions
  const affiliateQuery = useQuery({
    queryKey: ["revenue-affiliates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("id, amount, commission, status, created_at")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // Fetch deals (closed_won for sponsors)
  const dealsQuery = useQuery({
    queryKey: ["revenue-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals" as any)
        .select("id, title, value, stage, closed_at, created_at, notes")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // Fetch channel analytics (for estimated_revenue / ad revenue)
  const channelAnalyticsQuery = useQuery({
    queryKey: ["revenue-channel-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, estimated_revenue, views, subscribers")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // Compute monthly revenue by stream
  const monthlyRevenueByStream = useMemo((): MonthlyRevenueByStream[] => {
    const monthMap = new Map<string, { sponsors: number; affiliates: number; ads: number }>();

    // Sponsor deals (closed_won) — attribute to End Date month
    (dealsQuery.data ?? [])
      .filter((d: any) => d.stage === "closed_won")
      .forEach((d: any) => {
        const date = getDealAttributionDate(d);
        if (!date) return;
        const month = date.slice(0, 7); // YYYY-MM
        const existing = monthMap.get(month) ?? { sponsors: 0, affiliates: 0, ads: 0 };
        existing.sponsors += Number(d.value ?? 0);
        monthMap.set(month, existing);
      });

    // Affiliate transactions
    (affiliateQuery.data ?? []).forEach((t: any) => {
      const date = t.created_at;
      if (!date) return;
      const month = date.slice(0, 7);
      const existing = monthMap.get(month) ?? { sponsors: 0, affiliates: 0, ads: 0 };
      existing.affiliates += Number(t.commission ?? t.amount ?? 0);
      monthMap.set(month, existing);
    });

    // Ad revenue from channel analytics
    (channelAnalyticsQuery.data ?? []).forEach((a: any) => {
      const date = a.date;
      if (!date) return;
      const month = date.slice(0, 7);
      const existing = monthMap.get(month) ?? { sponsors: 0, affiliates: 0, ads: 0 };
      existing.ads += Number(a.estimated_revenue ?? 0);
      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.sponsors + data.affiliates + data.ads,
      }));
  }, [dealsQuery.data, affiliateQuery.data, channelAnalyticsQuery.data]);

  // Revenue per 1k subs
  const revenuePerKSubs = useMemo((): number => {
    const analytics = channelAnalyticsQuery.data ?? [];
    if (analytics.length === 0) return 0;
    const latestSubs = Number(analytics[analytics.length - 1]?.subscribers ?? 0);
    if (latestSubs === 0) return 0;
    const totalRevenue = monthlyRevenueByStream.reduce((s, m) => s + m.total, 0);
    return (totalRevenue / latestSubs) * 1000;
  }, [channelAnalyticsQuery.data, monthlyRevenueByStream]);

  // RPM trend
  const rpmTrend = useMemo((): RPMDataPoint[] => {
    const analytics = channelAnalyticsQuery.data ?? [];
    const monthMap = new Map<string, { revenue: number; views: number }>();

    analytics.forEach((a: any) => {
      const month = (a.date ?? "").slice(0, 7);
      if (!month) return;
      const existing = monthMap.get(month) ?? { revenue: 0, views: 0 };
      existing.revenue += Number(a.estimated_revenue ?? 0);
      existing.views += Number(a.views ?? 0);
      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        rpm: data.views > 0 ? (data.revenue / data.views) * 1000 : 0,
      }));
  }, [channelAnalyticsQuery.data]);

  // Pending deal opportunities
  const pendingOpportunities = useMemo((): PendingOpportunity[] => {
    return (dealsQuery.data ?? [])
      .filter((d: any) => d.stage !== "closed_won" && d.stage !== "closed_lost")
      .map((d: any) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value ?? 0),
        stage: d.stage,
      }))
      .sort((a: PendingOpportunity, b: PendingOpportunity) => b.value - a.value);
  }, [dealsQuery.data]);

  // Current month revenue
  const currentMonthRevenue = useMemo((): number => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const found = monthlyRevenueByStream.find((m) => m.month === currentMonth);
    return found?.total ?? 0;
  }, [monthlyRevenueByStream]);

  // Update revenue goal
  const updateRevenueGoal = useMutation({
    mutationFn: async (targetValue: number) => {
      const existing = goalQuery.data;
      if (existing) {
        const { data, error } = await supabase
          .from("growth_goals" as any)
          .update({ target_value: targetValue })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("growth_goals" as any)
          .insert({
            workspace_id: workspaceId,
            metric: "revenue",
            target_value: targetValue,
            current_value: 0,
            period: "monthly",
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue-goal"] }),
  });

  return {
    goal: goalQuery.data,
    monthlyRevenueByStream,
    revenuePerKSubs,
    rpmTrend,
    pendingOpportunities,
    currentMonthRevenue,
    isLoading:
      goalQuery.isLoading ||
      affiliateQuery.isLoading ||
      dealsQuery.isLoading ||
      channelAnalyticsQuery.isLoading,
    updateRevenueGoal,
  };
}
