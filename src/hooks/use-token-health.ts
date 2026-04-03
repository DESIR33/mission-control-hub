import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TokenHealth {
  id: string;
  workspace_id: string;
  integration_key: string;
  status: "healthy" | "degraded" | "expired" | "unknown";
  last_checked_at: string;
  last_healthy_at: string | null;
  error_message: string | null;
  expires_in_seconds: number | null;
}

export function useTokenHealth(integrationKey?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["integration_token_health", workspaceId, integrationKey],
    queryFn: async () => {
      let q = (supabase as any)
        .from("integration_token_health")
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (integrationKey) q = q.eq("integration_key", integrationKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TokenHealth[];
    },
    enabled: !!workspaceId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}

export function useTriggerTokenHealthCheck() {
  const { workspaceId } = useWorkspace();
  return async () => {
    const { data, error } = await supabase.functions.invoke("youtube-token-health", {
      body: { workspace_id: workspaceId },
    });
    if (error) throw error;
    return data;
  };
}
