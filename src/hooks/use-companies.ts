import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import type { Company, Contact } from "@/types/crm";

export function useCompanies() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["companies", workspaceId],
    queryFn: async (): Promise<Company[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("companies")
        .select("id, workspace_id, name, logo_url, industry, website, description, size, revenue, location, country, state, city, phone, primary_email, secondary_email, vip_tier, notes, last_contact_date, is_agency, social_twitter, social_linkedin, social_youtube, social_instagram, social_facebook, social_tiktok, social_producthunt, social_crunchbase, social_whatsapp, social_github, social_discord, funding_stage, total_funding, last_funding_date, founded_year, founder_names, pricing_model, tech_stack, outreach_status, sponsor_fit_score, competitor_group, created_at, updated_at, deleted_at, created_by, response_sla_minutes, contacts(id, first_name, last_name, email, role, status)")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        vip_tier: (row.vip_tier ?? "none") as Company["vip_tier"],
        is_agency: (row as any).is_agency ?? false,
        enrichment_brandfetch: null,
        enrichment_clay: null,
        enrichment_firecrawl: null,
        funding_stage: (row as any).funding_stage ?? null,
        total_funding: (row as any).total_funding ?? null,
        last_funding_date: (row as any).last_funding_date ?? null,
        founded_year: (row as any).founded_year ?? null,
        founder_names: (row as any).founder_names ?? null,
        pricing_model: (row as any).pricing_model ?? null,
        tech_stack: (row as any).tech_stack ?? null,
        outreach_status: (row as any).outreach_status ?? null,
        sponsor_fit_score: (row as any).sponsor_fit_score ?? null,
        competitor_group: (row as any).competitor_group ?? null,
        contacts: (row.contacts ?? []) as Contact[],
      }));
    },
    enabled: !!workspaceId,
    ...getFreshness("companies"),
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
      is_agency?: boolean;
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
      social_crunchbase?: string;
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
      is_agency?: boolean;
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
      social_twitter?: string;
      social_linkedin?: string;
      social_youtube?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_tiktok?: string;
      social_producthunt?: string;
      social_crunchbase?: string;
      social_whatsapp?: string;
      social_github?: string;
      social_discord?: string;
      vip_tier?: string;
      response_sla_minutes?: number | null;
      notes?: string;
      funding_stage?: string | null;
      total_funding?: number | null;
      last_funding_date?: string | null;
      founded_year?: number | null;
      founder_names?: string | null;
      pricing_model?: string | null;
      tech_stack?: string | null;
      outreach_status?: string | null;
      sponsor_fit_score?: number | null;
      competitor_group?: string | null;
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
        .select("id, workspace_id, first_name, last_name, email, phone, status, role, source, company_id, vip_tier, website, avatar_url, preferred_channel, last_contact_date, notes, created_at, updated_at, deleted_at, custom_fields, owner_id, escalation_owner_id, response_sla_minutes, created_by, social_twitter, social_linkedin, social_youtube, social_instagram, social_facebook, social_telegram, social_whatsapp")
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
        enrichment_hunter: null,
        enrichment_ai: null,
        enrichment_youtube: null,
      }));
    },
    enabled: !!workspaceId && !!companyId,
    ...getFreshness("companies"),
  });
}

export function useDeleteCompany() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase.rpc("soft_delete_company", {
        company_id: id,
        ws_id: workspaceId,
      });

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
