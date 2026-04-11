import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface DealContact {
  id: string;
  deal_id: string;
  contact_id: string;
  role: string | null;
  created_at: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function useDealContacts(dealId: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["deal-contacts", dealId],
    queryFn: async (): Promise<DealContact[]> => {
      if (!dealId || !workspaceId) return [];

      const { data, error } = await supabase
        .from("deal_contacts")
        .select("*, contacts(id, first_name, last_name, email)")
        .eq("deal_id", dealId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        contact: row.contacts ?? null,
      }));
    },
    enabled: !!dealId && !!workspaceId,
  });
}

export function useLinkDealContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, contactId, role }: { dealId: string; contactId: string; role?: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("deal_contacts")
        .insert({
          workspace_id: workspaceId,
          deal_id: dealId,
          contact_id: contactId,
          role: role || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deal-contacts", vars.dealId] });
    },
  });
}

export function useUnlinkDealContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dealId }: { id: string; dealId: string }) => {
      const { error } = await supabase
        .from("deal_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deal-contacts", vars.dealId] });
    },
  });
}
