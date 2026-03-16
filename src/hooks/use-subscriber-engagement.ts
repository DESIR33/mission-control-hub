import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberEngagementEvent } from "@/types/subscriber";

export function useSubscriberEngagementEvents(subscriberId: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-engagement-events", workspaceId, subscriberId],
    queryFn: async (): Promise<SubscriberEngagementEvent[]> => {
      if (!workspaceId || !subscriberId) return [];

      const { data, error } = await supabase
        .from("subscriber_engagement_events" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("subscriber_id", subscriberId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return ((data as any[]) ?? []).map((row) => ({
        ...row,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
      }));
    },
    enabled: !!workspaceId && !!subscriberId,
  });
}

export function useTrackEngagementEvent() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      subscriber_id: string;
      event_type: SubscriberEngagementEvent['event_type'];
      metadata?: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_engagement_events" as any)
        .insert({ ...event, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-engagement-events", workspaceId, variables.subscriber_id] });
    },
  });
}

export function useRecalculateEngagement() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase.functions.invoke("calculate-subscriber-engagement", {
        body: { workspace_id: workspaceId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
    },
  });
}
