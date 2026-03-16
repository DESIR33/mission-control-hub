import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Subscriber, SubscriberVideoNotification, SubscriberGuide } from "@/types/subscriber";
import { getEngagementTier } from "@/types/subscriber";

export interface SubscriberAnalytics {
  totalSubscribers: number;
  activeCount: number;
  inactiveCount: number;
  unsubscribedCount: number;
  bouncedCount: number;
  engagementDistribution: { hot: number; warm: number; cool: number; cold: number };
  sourceBreakdown: Record<string, number>;
  recentSubscribers: Subscriber[];
  growthByMonth: { month: string; count: number }[];
}

export function useSubscriberAnalytics() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-analytics", workspaceId],
    queryFn: async (): Promise<SubscriberAnalytics> => {
      if (!workspaceId) {
        return {
          totalSubscribers: 0, activeCount: 0, inactiveCount: 0, unsubscribedCount: 0, bouncedCount: 0,
          engagementDistribution: { hot: 0, warm: 0, cool: 0, cold: 0 },
          sourceBreakdown: {}, recentSubscribers: [], growthByMonth: [],
        };
      }

      const { data, error } = await supabase
        .from("subscribers" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const subscribers = (data ?? []) as unknown as Subscriber[];

      const statusCounts = { active: 0, inactive: 0, unsubscribed: 0, bounced: 0 };
      const engagementDist = { hot: 0, warm: 0, cool: 0, cold: 0 };
      const sourceMap: Record<string, number> = {};
      const monthMap: Record<string, number> = {};

      for (const sub of subscribers) {
        statusCounts[sub.status] = (statusCounts[sub.status] ?? 0) + 1;
        engagementDist[getEngagementTier(sub.engagement_score)]++;
        const src = sub.source ?? "unknown";
        sourceMap[src] = (sourceMap[src] ?? 0) + 1;
        const month = sub.created_at.substring(0, 7); // "YYYY-MM"
        monthMap[month] = (monthMap[month] ?? 0) + 1;
      }

      const growthByMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      return {
        totalSubscribers: subscribers.length,
        activeCount: statusCounts.active,
        inactiveCount: statusCounts.inactive,
        unsubscribedCount: statusCounts.unsubscribed,
        bouncedCount: statusCounts.bounced,
        engagementDistribution: engagementDist,
        sourceBreakdown: sourceMap,
        recentSubscribers: subscribers.slice(0, 10),
        growthByMonth,
      };
    },
    enabled: !!workspaceId,
  });
}
