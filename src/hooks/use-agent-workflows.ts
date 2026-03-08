import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AgentWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  trigger_config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  steps?: AgentWorkflowStep[];
}

export interface AgentWorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  agent_slug: string;
  skill_slug: string | null;
  input_template: Record<string, unknown>;
  condition: Record<string, unknown>;
  created_at: string;
}

export function useAgentWorkflows() {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentWorkflow[]>({
    queryKey: ["agent-workflows", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_workflows")
        .select("*, agent_workflow_steps(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((w: any) => ({
        ...w,
        steps: (w.agent_workflow_steps ?? []).sort((a: any, b: any) => a.step_order - b.step_order),
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkflow() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description: string; steps: { agent_slug: string; skill_slug?: string; input_template?: Record<string, unknown> }[] }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: wf, error } = await query("agent_workflows")
        .insert({ workspace_id: workspaceId, name: data.name, description: data.description })
        .select().single();
      if (error) throw error;
      if (data.steps.length > 0) {
        const stepsToInsert = data.steps.map((s, i) => ({
          workflow_id: wf.id,
          step_order: i,
          agent_slug: s.agent_slug,
          skill_slug: s.skill_slug || null,
          input_template: s.input_template || {},
        }));
        const { error: stepErr } = await query("agent_workflow_steps").insert(stepsToInsert);
        if (stepErr) throw stepErr;
      }
      return wf;
    },
    onSuccess: () => { toast.success("Workflow created!"); qc.invalidateQueries({ queryKey: ["agent-workflows"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("agent_workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Workflow deleted"); qc.invalidateQueries({ queryKey: ["agent-workflows"] }); },
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await query("agent_workflows").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-workflows"] }),
  });
}
