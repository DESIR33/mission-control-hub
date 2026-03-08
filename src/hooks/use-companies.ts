import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Company, Contact } from "@/types/crm";

export function useCompanies() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["companies", workspaceId],
    queryFn: async (): Promise<Company[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("companies")
        .select("*, contacts(id, first_name, last_name, email, role, status)")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        vip_tier: (row.vip_tier ?? "none") as Company["vip_tier"],
        enrichment_brandfetch: row.enrichment_brandfetch as Record<string, unknown> | null,
        enrichment_clay: row.enrichment_clay as Record<string, unknown> | null,
        enrichment_firecrawl: row.enrichment_firecrawl as Record<string, unknown> | null,
        contacts: (row.contacts ?? []) as Contact[],
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: {
      name: string;
      logo_url?: string;
      industry?: string;
      website?: string;
      description?: string;
      size?: string;
      revenue?: string;
      location?: string;
      country?: string;
      state?: string;
      city?: string;
      phone?: string;
      primary_email?: string;
      secondary_email?: string;
      vip_tier?: string;
      social_twitter?: string;
      social_linkedin?: string;
      social_youtube?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_tiktok?: string;
      social_producthunt?: string;
      social_whatsapp?: string;
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...company,
          workspace_id: workspaceId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", workspaceId] });
    },
  });
}

export function useUpdateCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      logo_url?: string;
      industry?: string;
      website?: string;
      description?: string;
      size?: string;
      revenue?: string;
      location?: string;
      primary_email?: string;
      secondary_email?: string;
      social_twitter?: string;
      social_linkedin?: string;
      social_youtube?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_tiktok?: string;
      social_producthunt?: string;
      vip_tier?: string;
      response_sla_minutes?: number | null;
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", workspaceId] });
    },
  });
}

export function useCompanyContacts(companyId: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["company-contacts", workspaceId, companyId],
    queryFn: async (): Promise<Contact[]> => {
      if (!workspaceId || !companyId) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("first_name");

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        status: row.status as Contact["status"],
        vip_tier: (row.vip_tier ?? "none") as Contact["vip_tier"],
        preferred_channel: (row.preferred_channel ?? "email") as Contact["preferred_channel"],
        custom_fields: (row.custom_fields as Record<string, unknown>) ?? {},
        enrichment_hunter: row.enrichment_hunter as Record<string, unknown> | null,
        enrichment_ai: row.enrichment_ai as Record<string, unknown> | null,
        enrichment_youtube: row.enrichment_youtube as Record<string, unknown> | null,
      }));
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useDeleteCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("companies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["company-contacts", workspaceId] });
    },
  });
}

export function useAssociateContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, companyId }: { contactId: string; companyId: string | null }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("contacts")
        .update({ company_id: companyId })
        .eq("id", contactId)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["company-contacts", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["contacts", workspaceId] });
    },
  });
}
