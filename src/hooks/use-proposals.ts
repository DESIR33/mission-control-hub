import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AiProposal, ProposalStatus } from "@/types/proposals";
import { mockProposals } from "@/data/mock-proposals";

// Stub — ai_proposals table doesn't exist yet.
export function useProposals() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["ai_proposals", workspaceId],
    queryFn: async (): Promise<AiProposal[]> => {
      if (!workspaceId) return [];
      return mockProposals;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateProposalStatus() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; status: ProposalStatus }) => null,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_proposals", workspaceId] }),
  });
}

export function useUpdateProposal() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; proposed_changes: Record<string, unknown>; summary?: string }) => null,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_proposals", workspaceId] }),
  });
}
