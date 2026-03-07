import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Collaboration } from "@/hooks/use-collaborations";

export interface CollabImpact {
  collabId: string;
  creatorName: string;
  publishDate: string;
  subsBefore: number;
  subsOnDay: number;
  subsAfter: number;
  subscriberLift: number;
  dailyData: { date: string; subscribers: number }[];
}

export interface CollabImpactAggregates {
  totalSubsGained: number;
  avgGainPerCollab: number;
  bestCollab: CollabImpact | null;
}

export function useCollabImpact(collaborations: Collaboration[]) {
  const { workspaceId } = useWorkspace();

  const publishedCollabs = useMemo(
    () => collaborations.filter((c) => c.status === "published" && c.scheduled_date),
    [collaborations]
  );

  const { data: analyticsData = [] } = useQuery({
    queryKey: ["collab-impact-analytics", workspaceId, publishedCollabs.map((c) => c.id).join(",")],
    queryFn: async () => {
      if (publishedCollabs.length === 0) return [];

      // Fetch youtube_channel_analytics data around collab dates
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, subscriber_count")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as { date: string; subscriber_count: number }[];
    },
    enabled: !!workspaceId && publishedCollabs.length > 0,
  });

  const impactData = useMemo((): CollabImpact[] => {
    if (analyticsData.length === 0 || publishedCollabs.length === 0) return [];

    return publishedCollabs.map((collab) => {
      const publishDate = collab.scheduled_date!;
      const pubTime = new Date(publishDate).getTime();

      // Filter analytics within +/- 14 days
      const relevantData = analyticsData.filter((d) => {
        const dayTime = new Date(d.date).getTime();
        const diffDays = (dayTime - pubTime) / (1000 * 60 * 60 * 24);
        return diffDays >= -14 && diffDays <= 14;
      });

      // Find subs 7 days before, on day, and 7 days after
      const findClosest = (targetDate: Date) => {
        const targetTime = targetDate.getTime();
        let closest = relevantData[0];
        let minDiff = Infinity;
        for (const d of relevantData) {
          const diff = Math.abs(new Date(d.date).getTime() - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = d;
          }
        }
        return closest?.subscriber_count ?? 0;
      };

      const beforeDate = new Date(pubTime - 7 * 24 * 60 * 60 * 1000);
      const afterDate = new Date(pubTime + 7 * 24 * 60 * 60 * 1000);

      const subsBefore = findClosest(beforeDate);
      const subsOnDay = findClosest(new Date(pubTime));
      const subsAfter = findClosest(afterDate);
      const subscriberLift = subsAfter - subsBefore;

      const dailyData = relevantData
        .filter((d) => {
          const dayTime = new Date(d.date).getTime();
          const diffDays = (dayTime - pubTime) / (1000 * 60 * 60 * 24);
          return diffDays >= -14 && diffDays <= 14;
        })
        .map((d) => ({
          date: d.date,
          subscribers: d.subscriber_count,
        }));

      return {
        collabId: collab.id,
        creatorName: collab.creator_name,
        publishDate,
        subsBefore,
        subsOnDay,
        subsAfter,
        subscriberLift,
        dailyData,
      };
    });
  }, [publishedCollabs, analyticsData]);

  const aggregates = useMemo((): CollabImpactAggregates => {
    if (impactData.length === 0) {
      return { totalSubsGained: 0, avgGainPerCollab: 0, bestCollab: null };
    }

    const totalSubsGained = impactData.reduce((s, d) => s + d.subscriberLift, 0);
    const avgGainPerCollab = Math.round(totalSubsGained / impactData.length);
    const bestCollab = impactData.reduce(
      (best, d) => (d.subscriberLift > (best?.subscriberLift ?? -Infinity) ? d : best),
      null as CollabImpact | null
    );

    return { totalSubsGained, avgGainPerCollab, bestCollab };
  }, [impactData]);

  return {
    impactData,
    aggregates,
    isLoading: false,
  };
}
