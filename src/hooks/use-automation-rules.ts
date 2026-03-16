import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AutomationRule {
  id: string;
  workspace_id: string;
  rule_type: "deal_stale" | "contact_inactive" | "post_publish_followup";
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useAutomationRules() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["automation-rules", workspaceId],
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await supabase
        .from("automation_rules" as any)
        .select("id, workspace_id, rule_type, config, enabled, created_at, updated_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AutomationRule[];
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  });
}

export function useCreateAutomationRule() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      rule_type: string;
      config: Record<string, unknown>;
      enabled?: boolean;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("automation_rules" as any).insert({
        workspace_id: workspaceId,
        rule_type: input.rule_type,
        config: input.config,
        enabled: input.enabled ?? true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules", workspaceId] }),
  });
}

export function useUpdateAutomationRule() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; config?: Record<string, unknown>; enabled?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (input.config !== undefined) updates.config = input.config;
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      const { error } = await supabase.from("automation_rules" as any).update(updates as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules", workspaceId] }),
  });
}

export function useDeleteAutomationRule() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules", workspaceId] }),
  });
}
