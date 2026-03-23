import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import type { Company } from "@/types/crm";

export interface AgencyLink {
  id: string;
  workspace_id: string;
  agency_id: string;
  client_company_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  agency?: { id: string; name: string; logo_url: string | null } | null;
  client_company?: { id: string; name: string; logo_url: string | null; industry: string | null } | null;
}

/** Get all client companies linked to a given agency */
export function useAgencyClients(agencyId: string | undefined | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["agency-clients", workspaceId, agencyId],
    queryFn: async (): Promise<AgencyLink[]> => {
      if (!workspaceId || !agencyId) return [];

      const { data, error } = await supabase
        .from("company_agency_links" as any)
        .select("id, workspace_id, agency_id, client_company_id, notes, created_at, updated_at, client_company:companies!company_agency_links_client_company_id_fkey(id, name, logo_url, industry)")
        .eq("workspace_id", workspaceId)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!workspaceId && !!agencyId,
    ...getFreshness("companies"),
  });
}

/** Get all agencies that represent a given client company */
export function useCompanyAgencies(clientCompanyId: string | undefined | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["company-agencies", workspaceId, clientCompanyId],
    queryFn: async (): Promise<AgencyLink[]> => {
      if (!workspaceId || !clientCompanyId) return [];

      const { data, error } = await supabase
        .from("company_agency_links" as any)
        .select("id, workspace_id, agency_id, client_company_id, notes, created_at, updated_at, agency:companies!company_agency_links_agency_id_fkey(id, name, logo_url)")
        .eq("workspace_id", workspaceId)
        .eq("client_company_id", clientCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!workspaceId && !!clientCompanyId,
    ...getFreshness("companies"),
  });
}

export function useLinkAgencyClient() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agencyId, clientCompanyId, notes }: { agencyId: string; clientCompanyId: string; notes?: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("company_agency_links" as any)
        .insert({ workspace_id: workspaceId, agency_id: agencyId, client_company_id: clientCompanyId, notes: notes || null } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients", workspaceId, vars.agencyId] });
      queryClient.invalidateQueries({ queryKey: ["company-agencies", workspaceId, vars.clientCompanyId] });
    },
  });
}

export function useUnlinkAgencyClient() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("company_agency_links" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["company-agencies", workspaceId] });
    },
  });
}
