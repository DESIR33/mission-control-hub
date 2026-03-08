import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const q = (table: string) => (supabase as any).from(table);

export interface AutoExecutionRule {
  id: string;
  workspace_id: string;
  agent_slug: string;
  confidence_threshold: number;
  enabled: boolean;
  auto_executed_count: number;
  created_at: string;
}

export function useAutoExecutionRules() {
  const { workspaceId } = useWorkspace();
  return useQuery<AutoExecutionRule[]>({
    queryKey: ["auto-execution-rules", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("auto_execution_rules").select("*").eq("workspace_id", workspaceId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertAutoExecutionRule() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: { agent_slug: string; confidence_threshold: number; enabled: boolean }) => {
      if (!workspaceId) throw new Error("No workspace");
      // Check if rule exists
      const { data: existing } = await q("auto_execution_rules").select("id").eq("workspace_id", workspaceId).eq("agent_slug", rule.agent_slug).maybeSingle();
      if (existing) {
        const { error } = await q("auto_execution_rules").update({ confidence_threshold: rule.confidence_threshold, enabled: rule.enabled, updated_at: new Date().toISOString() }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await q("auto_execution_rules").insert({ workspace_id: workspaceId, ...rule });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Auto-execution rule saved"); qc.invalidateQueries({ queryKey: ["auto-execution-rules"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
