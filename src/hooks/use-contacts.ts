import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Contact, Activity } from "@/types/crm";

export function useContacts() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["contacts", workspaceId],
    queryFn: async (): Promise<Contact[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("id, workspace_id, first_name, last_name, email, phone, status, role, source, company_id, vip_tier, website, avatar_url, preferred_channel, last_contact_date, notes, created_at, updated_at, deleted_at, custom_fields, owner_id, escalation_owner_id, response_sla_minutes, created_by, social_twitter, social_linkedin, social_youtube, social_instagram, social_facebook, social_telegram, social_whatsapp, companies(id, name, logo_url, industry)")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

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
        company: row.companies as Contact["company"] ?? null,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useCreateContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: {
      first_name: string;
      last_name?: string;
      email?: string;
      phone?: string;
      status?: string;
      role?: string;
      role_id?: string;
      source?: string;
      company_id?: string;
      vip_tier?: string;
      website?: string;
      social_twitter?: string;
      social_linkedin?: string;
      social_youtube?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_telegram?: string;
      social_whatsapp?: string;
      social_discord?: string;
      city?: string;
      state?: string;
      country?: string;
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          ...contact,
          workspace_id: workspaceId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", workspaceId] });
    },
  });
}

export function useUpdateContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      status?: string;
      role?: string;
      role_id?: string | null;
      source?: string;
      company_id?: string | null;
      vip_tier?: string;
      website?: string;
      notes?: string;
      preferred_channel?: string;
      response_sla_minutes?: number | null;
      city?: string;
      state?: string;
      country?: string;
      social_twitter?: string;
      social_linkedin?: string;
      social_youtube?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_telegram?: string;
      social_whatsapp?: string;
      social_discord?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["company-contacts", workspaceId] });
    },
  });
}

export function useDeleteContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["company-contacts", workspaceId] });
    },
  });
}

export function useActivities(entityId: string | null, entityType: string = "contact") {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["activities", workspaceId, entityId, entityType],
    queryFn: async () => {
      if (!workspaceId || !entityId) return [];

      const { data, error } = await supabase
        .from("activities")
        .select("id, workspace_id, entity_id, entity_type, activity_type, title, description, performed_at, performed_by, metadata, created_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .order("performed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        entity_type: row.entity_type as Activity["entity_type"],
        metadata: (row.metadata as Record<string, unknown>) ?? {},
      }));
    },
    enabled: !!workspaceId && !!entityId,
    staleTime: 120_000,
  });
}

export interface ContactRole {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

export function useContactRoles() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["contact-roles", workspaceId],
    queryFn: async (): Promise<ContactRole[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("contact_roles" as any)
        .select("id, workspace_id, name, created_at")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return (data ?? []) as unknown as ContactRole[];
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  });
}

export function useCreateContactRole() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("contact_roles" as any)
        .insert({ workspace_id: workspaceId, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-roles", workspaceId] });
    },
  });
}

export function useCreateActivity() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      entity_id: string;
      entity_type: string;
      activity_type: string;
      title?: string;
      description?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("activities")
        .insert({
          ...activity,
          workspace_id: workspaceId,
          performed_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activities", workspaceId, variables.entity_id],
      });
    },
  });
}
