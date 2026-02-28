import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface ChannelStats {
  id: string;
  workspace_id: string;
  subscriber_count: number;
  video_count: number;
  total_view_count: number;
  fetched_at: string;
  created_at: string;
}

export interface GrowthGoal {
  id: string;
  workspace_id: string;
  title: string;
  metric: string;
  target_value: number;
  current_value: number;
  start_date: string | null;
  target_date: string | null;
  status: "active" | "achieved" | "paused";
  created_at: string;
  updated_at: string;
}

export function useChannelStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube_channel_stats", workspaceId],
    queryFn: async (): Promise<ChannelStats | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Table may not exist yet if migration hasn't run
        console.warn("youtube_channel_stats query failed:", error.message);
        return null;
      }

      return data as ChannelStats | null;
    },
    enabled: !!workspaceId,
  });
}

export function useChannelStatsHistory() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube_channel_stats_history", workspaceId],
    queryFn: async (): Promise<ChannelStats[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("fetched_at", { ascending: true })
        .limit(30);

      if (error) {
        console.warn("youtube_channel_stats history query failed:", error.message);
        return [];
      }

      return (data ?? []) as ChannelStats[];
    },
    enabled: !!workspaceId,
  });
}

export function useGrowthGoal() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["growth_goals", workspaceId],
    queryFn: async (): Promise<GrowthGoal | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("growth_goals query failed:", error.message);
        return null;
      }

      return data as GrowthGoal | null;
    },
    enabled: !!workspaceId,
  });
}
