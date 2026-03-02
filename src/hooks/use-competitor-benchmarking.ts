import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import { useMemo } from "react";

export interface CompetitorChannel {
  id: string;
  workspace_id: string;
  channel_name: string;
  channel_url: string | null;
  youtube_channel_id: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  total_view_count: number | null;
  avg_views_per_video: number | null;
  avg_ctr: number | null;
  upload_frequency: string | null;
  primary_niche: string | null;
  notes: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkComparison {
  metric: string;
  yours: number;
  competitorAvg: number;
  delta: number;
  deltaPercent: number;
  status: "ahead" | "behind" | "even";
}

export interface CompetitorBenchmark {
  competitors: CompetitorChannel[];
  comparisons: BenchmarkComparison[];
  yourPosition: { metric: string; rank: number; total: number }[];
  insights: string[];
}

export function useCompetitorChannels() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["competitor-channels", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_channels" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("subscriber_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CompetitorChannel[];
    },
    enabled: !!workspaceId,
  });
}

export function useCompetitorBenchmark() {
  const { data: competitors = [], isLoading: compLoading } = useCompetitorChannels();
  const { data: myStats, isLoading: statsLoading } = useChannelStats();

  const benchmark = useMemo((): CompetitorBenchmark | null => {
    if (!myStats || !competitors.length) return null;

    const withSubs = competitors.filter((c) => c.subscriber_count != null);
    const withViews = competitors.filter((c) => c.total_view_count != null);
    const withVideos = competitors.filter((c) => c.video_count != null);
    const withAvgViews = competitors.filter((c) => c.avg_views_per_video != null);

    const avgSubs = withSubs.length > 0
      ? withSubs.reduce((s, c) => s + c.subscriber_count!, 0) / withSubs.length
      : 0;
    const avgViews = withViews.length > 0
      ? withViews.reduce((s, c) => s + Number(c.total_view_count!), 0) / withViews.length
      : 0;
    const avgVideoCount = withVideos.length > 0
      ? withVideos.reduce((s, c) => s + c.video_count!, 0) / withVideos.length
      : 0;
    const avgViewsPerVideo = withAvgViews.length > 0
      ? withAvgViews.reduce((s, c) => s + c.avg_views_per_video!, 0) / withAvgViews.length
      : 0;

    function compare(metric: string, yours: number, compAvg: number): BenchmarkComparison {
      const delta = yours - compAvg;
      const deltaPercent = compAvg > 0 ? (delta / compAvg) * 100 : 0;
      const status: "ahead" | "behind" | "even" =
        deltaPercent > 5 ? "ahead" : deltaPercent < -5 ? "behind" : "even";
      return { metric, yours, competitorAvg: compAvg, delta, deltaPercent, status };
    }

    const comparisons = [
      compare("Subscribers", myStats.subscriber_count, avgSubs),
      compare("Total Views", myStats.total_view_count, avgViews),
      compare("Video Count", myStats.video_count, avgVideoCount),
      compare("Avg Views/Video", myStats.total_view_count / Math.max(myStats.video_count, 1), avgViewsPerVideo),
    ];

    // Rank position
    const allSubs = [...withSubs.map((c) => c.subscriber_count!), myStats.subscriber_count].sort((a, b) => b - a);
    const subRank = allSubs.indexOf(myStats.subscriber_count) + 1;

    const allViews = [...withViews.map((c) => Number(c.total_view_count!)), myStats.total_view_count].sort((a, b) => b - a);
    const viewRank = allViews.indexOf(myStats.total_view_count) + 1;

    const yourPosition = [
      { metric: "Subscribers", rank: subRank, total: allSubs.length },
      { metric: "Total Views", rank: viewRank, total: allViews.length },
    ];

    // Insights
    const insights: string[] = [];
    const subsComparison = comparisons.find((c) => c.metric === "Subscribers")!;
    if (subsComparison.status === "ahead") {
      insights.push(`You're ahead of competitors by ${subsComparison.deltaPercent.toFixed(0)}% in subscribers.`);
    } else if (subsComparison.status === "behind") {
      insights.push(`Competitors average ${Math.abs(subsComparison.deltaPercent).toFixed(0)}% more subscribers — focus on growth tactics.`);
    }

    const topCompetitor = competitors[0];
    if (topCompetitor && topCompetitor.subscriber_count) {
      const gap = topCompetitor.subscriber_count - myStats.subscriber_count;
      if (gap > 0) {
        insights.push(`Gap to #1 competitor "${topCompetitor.channel_name}": ${gap.toLocaleString()} subscribers.`);
      }
    }

    return { competitors, comparisons, yourPosition, insights };
  }, [competitors, myStats]);

  return { data: benchmark, isLoading: compLoading || statsLoading };
}

export function useCreateCompetitor() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competitor: Partial<CompetitorChannel>) => {
      const { data, error } = await supabase
        .from("competitor_channels" as any)
        .insert({ ...competitor, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-channels"] }),
  });
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompetitorChannel> & { id: string }) => {
      const { data, error } = await supabase
        .from("competitor_channels" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-channels"] }),
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitor_channels" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-channels"] }),
  });
}

export function useSyncCompetitors() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-competitor-stats", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-channels"] }),
  });
}
