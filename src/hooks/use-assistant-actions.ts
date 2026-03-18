import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AssistantAction {
  id: string;
  action_type: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  proposal_id: string | null;
  task_id: string | null;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
}

export function useAssistantActions(limit = 50) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["assistant-actions", workspaceId, limit],
    queryFn: async (): Promise<AssistantAction[]> => {
      const { data, error } = await supabase
        .from("assistant_actions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });
}

export function useTasks() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-tasks", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });
}
