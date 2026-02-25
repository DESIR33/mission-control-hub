import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { AiProposal, ProposalStatus } from "@/types/proposals";
import { mockProposals } from "@/data/mock-proposals";

export function useProposals() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["ai_proposals", workspaceId],
    queryFn: async (): Promise<AiProposal[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("ai_proposals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const proposals = (data ?? []).map((row) => ({
        ...row,
        status: row.status as AiProposal["status"],
        entity_type: row.entity_type as AiProposal["entity_type"],
        proposal_type: row.proposal_type as AiProposal["proposal_type"],
        proposed_changes: (row.proposed_changes as Record<string, unknown>) ?? {},
      }));

      // If no proposals in DB yet, return mock data for demo
      if (proposals.length === 0) {
        return mockProposals;
      }

      return proposals;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateProposalStatus() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ProposalStatus;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("ai_proposals")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai_proposals", workspaceId],
      });
    },
  });
}

export function useUpdateProposal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      proposed_changes,
      summary,
    }: {
      id: string;
      proposed_changes: Record<string, unknown>;
      summary?: string;
    }) => {
      const { data, error } = await supabase
        .from("ai_proposals")
        .update({
          proposed_changes,
          ...(summary !== undefined ? { summary } : {}),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai_proposals", workspaceId],
      });
    },
  });
}
