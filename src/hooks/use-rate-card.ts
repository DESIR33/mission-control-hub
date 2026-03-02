import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface RateTier {
  type: string;
  description: string;
  suggestedRate: number;
  avgHistoricalDeal: number;
  delta: number; // positive = you're over market, negative = under
}

export interface RateCardData {
  subscriberCount: number;
  avgViews: number;
  engagementRate: number;
  nicheMultiplier: number;
  rates: RateTier[];
  historicalDeals: Array<{ title: string; value: number; date: string }>;
  avgDealValue: number;
  isUndercharging: boolean;
}

export function useRateCard() {
  const { workspaceId } = useWorkspace();

  const { data: channelStats, isLoading: statsLoading } = useQuery({
    queryKey: ["rate-card-channel", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("subscriber_count, total_views, video_count")
        .eq("workspace_id", workspaceId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const { data: videoStats = [] } = useQuery({
    queryKey: ["rate-card-videos", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("views, likes, comments")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["rate-card-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("title, value, closed_at")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "closed_won")
        .is("deleted_at", null)
        .order("closed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const rateCard = useMemo((): RateCardData | null => {
    const subscriberCount = channelStats?.subscriber_count || 0;
    if (subscriberCount === 0 && !videoStats.length) return null;

    const totalViews = channelStats?.total_views || 0;
    const videoCount = channelStats?.video_count || 1;
    const avgViews = videoStats.length > 0
      ? videoStats.reduce((s: number, v: any) => s + (v.views || 0), 0) / videoStats.length
      : totalViews / videoCount;

    // Calculate engagement rate
    const totalLikes = videoStats.reduce((s: number, v: any) => s + (v.likes || 0), 0);
    const totalComments = videoStats.reduce((s: number, v: any) => s + (v.comments || 0), 0);
    const totalVideoViews = videoStats.reduce((s: number, v: any) => s + (v.views || 0), 0);
    const engagementRate = totalVideoViews > 0 ? ((totalLikes + totalComments) / totalVideoViews) * 100 : 3.5;

    // Niche multiplier (tech/business = 1.5x, default = 1.0x)
    const nicheMultiplier = 1.5; // Hustling Labs is tech/business

    // Base CPM rates for YouTube sponsorships
    const baseCPM: Record<string, { cpm: number; desc: string }> = {
      "Dedicated Video": { cpm: 50, desc: "Full video about sponsor's product" },
      "Integrated Mention": { cpm: 25, desc: "60-90 second integration within content" },
      "Pre-Roll (30s)": { cpm: 15, desc: "30-second spot at beginning of video" },
      "Post-Roll": { cpm: 10, desc: "End-of-video mention with CTA" },
      "Pinned Comment": { cpm: 5, desc: "Pinned comment with link" },
      "Community Post": { cpm: 8, desc: "Dedicated community tab post" },
    };

    // Historical deal analysis
    const historicalDeals = deals.map((d: any) => ({
      title: d.title,
      value: d.value || 0,
      date: d.closed_at || "",
    }));
    const avgDealValue = historicalDeals.length > 0
      ? historicalDeals.reduce((s, d) => s + d.value, 0) / historicalDeals.length
      : 0;

    // Calculate rates
    const rates: RateTier[] = Object.entries(baseCPM).map(([type, { cpm, desc }]) => {
      const impressions = avgViews / 1000;
      const suggestedRate = Math.round(impressions * cpm * nicheMultiplier);
      const delta = avgDealValue > 0 ? ((avgDealValue - suggestedRate) / suggestedRate) * 100 : 0;

      return {
        type,
        description: desc,
        suggestedRate,
        avgHistoricalDeal: Math.round(avgDealValue),
        delta: Math.round(delta),
      };
    });

    // Check if undercharging (avg deal < suggested integrated mention rate)
    const integratedRate = rates.find((r) => r.type === "Integrated Mention")?.suggestedRate ?? 0;
    const isUndercharging = avgDealValue > 0 && avgDealValue < integratedRate;

    return {
      subscriberCount,
      avgViews: Math.round(avgViews),
      engagementRate: Math.round(engagementRate * 10) / 10,
      nicheMultiplier,
      rates,
      historicalDeals,
      avgDealValue: Math.round(avgDealValue),
      isUndercharging,
    };
  }, [channelStats, videoStats, deals]);

  return { data: rateCard, isLoading: statsLoading };
}
