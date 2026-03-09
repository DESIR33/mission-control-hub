import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AgentAlertThreshold {
  id: string;
  workspace_id: string;
  agent_slug: string;
  metric_name: string;
  condition: "drops_below" | "exceeds" | "changes_by_percent";
  threshold_value: number;
  cooldown_hours: number;
  enabled: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export function useAgentAlertThresholds(agentSlug?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentAlertThreshold[]>({
    queryKey: ["agent-alert-thresholds", workspaceId, agentSlug],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("agent_alert_thresholds")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (agentSlug) q = q.eq("agent_slug", agentSlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AgentAlertThreshold[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateAlertThreshold() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      agent_slug: string;
      metric_name: string;
      condition: string;
      threshold_value: number;
      cooldown_hours?: number;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("agent_alert_thresholds").insert({
        workspace_id: workspaceId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert threshold created");
      qc.invalidateQueries({ queryKey: ["agent-alert-thresholds"] });
    },
  });
}

export function useToggleAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await query("agent_alert_thresholds")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-alert-thresholds"] }),
  });
}

export function useDeleteAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("agent_alert_thresholds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert threshold deleted");
      qc.invalidateQueries({ queryKey: ["agent-alert-thresholds"] });
    },
  });
}
