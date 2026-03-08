import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AgentCustomTrigger {
  id: string;
  workspace_id: string;
  name: string;
  natural_language_rule: string;
  parsed_condition: Record<string, unknown>;
  agent_slug: string;
  skill_slug: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export function useAgentTriggers() {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentCustomTrigger[]>({
    queryKey: ["agent-triggers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_custom_triggers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentCustomTrigger[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTrigger() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; natural_language_rule: string; agent_slug: string; skill_slug?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("agent_custom_triggers").insert({
        workspace_id: workspaceId,
        name: data.name,
        natural_language_rule: data.natural_language_rule,
        agent_slug: data.agent_slug,
        skill_slug: data.skill_slug || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trigger created!"); qc.invalidateQueries({ queryKey: ["agent-triggers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await query("agent_custom_triggers").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-triggers"] }),
  });
}

export function useDeleteTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("agent_custom_triggers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trigger deleted"); qc.invalidateQueries({ queryKey: ["agent-triggers"] }); },
  });
}
