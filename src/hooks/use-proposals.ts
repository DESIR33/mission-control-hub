import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AiProposal, ProposalStatus } from "@/types/proposals";

export function useProposals() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["ai_proposals", workspaceId],
    queryFn: async (): Promise<AiProposal[]> => {
      const { data, error } = await supabase
        .from("ai_proposals")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AiProposal[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateProposalStatus() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: ProposalStatus }) => {
      const { error } = await supabase
        .from("ai_proposals")
        .update({ status: args.status, reviewed_at: new Date().toISOString() } as any)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_proposals", workspaceId] }),
  });
}

export function useUpdateProposal() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; proposed_changes: Record<string, unknown>; summary?: string }) => {
      const { error } = await supabase
        .from("ai_proposals")
        .update({ content: args.proposed_changes, description: args.summary } as any)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_proposals", workspaceId] }),
  });
}
