import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function useStripeSync() {
  const { workspaceId } = useWorkspace();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-sync", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; charges_synced: number; subscriptions_synced: number };
    },
  });

  return syncMutation;
}

export function useStripeRevenue() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["revenue_transactions", workspaceId, "stripe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_transactions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("source", "stripe")
        .order("external_created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useStripeSyncLog() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["stripe_sync_log", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_sync_log")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}
