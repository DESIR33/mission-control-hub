import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";

/**
 * Optimization #4: Single consolidated polling query replacing 5+ separate pollers.
 * Uses a server-side RPC that returns all counts in one DB round-trip.
 */
export interface PollingCounts {
  pending_proposals: number;
  active_experiments: number;
  unread_notifications: number;
  performance_alerts: number;
}

export function usePollingCounts() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();

  return useQuery<PollingCounts>({
    queryKey: ["polling-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return {
          pending_proposals: 0,
          active_experiments: 0,
          unread_notifications: 0,
          performance_alerts: 0,
        };
      }

      try {
        const { data, error } = await supabase.rpc(
          "get_dashboard_polling_counts" as any,
          { p_workspace_id: workspaceId }
        );

        if (error) throw error;

        const counts = data as any;
        return {
          pending_proposals: Number(counts?.pending_proposals) || 0,
          active_experiments: Number(counts?.active_experiments) || 0,
          unread_notifications: Number(counts?.unread_notifications) || 0,
          performance_alerts: Number(counts?.performance_alerts) || 0,
        };
      } catch {
        // Fallback to zeros if RPC doesn't exist yet
        return {
          pending_proposals: 0,
          active_experiments: 0,
          unread_notifications: 0,
          performance_alerts: 0,
        };
      }
    },
    enabled: !!workspaceId,
    ...getFreshness("pollingCounts"),
  });
}
