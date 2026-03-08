import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface AgentFeedback {
  id: string;
  workspace_id: string;
  proposal_id: string | null;
  agent_slug: string;
  action: "accepted" | "rejected" | "edited";
  user_notes: string | null;
  original_content: Record<string, unknown>;
  edited_content: Record<string, unknown> | null;
  created_at: string;
}

export function useAgentFeedbackHistory(agentSlug?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentFeedback[]>({
    queryKey: ["agent-feedback", workspaceId, agentSlug],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("agent_feedback").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
      if (agentSlug) q = q.eq("agent_slug", agentSlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AgentFeedback[];
    },
    enabled: !!workspaceId,
  });
}

export function useSubmitFeedback() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedback: {
      proposal_id: string;
      agent_slug: string;
      action: "accepted" | "rejected" | "edited";
      user_notes?: string;
      original_content: Record<string, unknown>;
      edited_content?: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("agent_feedback").insert({
        workspace_id: workspaceId,
        ...feedback,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-feedback"] }),
  });
}
