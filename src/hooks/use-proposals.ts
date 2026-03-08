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
        .select("*, companies:company_id(name), contacts:contact_id(first_name, last_name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        let entity_name: string | undefined;
        if (row.companies?.name) {
          entity_name = row.companies.name;
        } else if (row.contacts?.first_name) {
          entity_name = [row.contacts.first_name, row.contacts.last_name].filter(Boolean).join(" ");
        }
        const { companies, contacts, ...rest } = row;
        // Merge content into proposed_changes as fallback
        const proposed_changes = rest.proposed_changes ?? rest.content ?? null;
        return { ...rest, entity_name, proposed_changes } as AiProposal;
      });
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

export function useExecuteProposal() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { data, error } = await supabase.functions.invoke("execute-proposal", {
        body: { proposal_id: proposalId, workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_proposals", workspaceId] }),
  });
}
