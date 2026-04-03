import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { ContactInteraction, ContactTag } from "@/types/crm";

// ── Contact Interactions ────────────────────────────────────────────────
export function useContactInteractions(contactId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["contact-interactions", workspaceId, contactId],
    queryFn: async (): Promise<ContactInteraction[]> => {
      if (!workspaceId || !contactId) return [];
      const { data, error } = await supabase
        .from("contact_interactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("interaction_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactInteraction[];
    },
    enabled: !!workspaceId && !!contactId,
  });
}

export function useCreateContactInteraction() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interaction: Omit<ContactInteraction, "id" | "workspace_id" | "created_at">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("contact_interactions")
        .insert({ ...interaction, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contact-interactions", workspaceId, vars.contact_id] });
      qc.invalidateQueries({ queryKey: ["contacts", workspaceId] });
    },
  });
}

// ── Contact Tags ────────────────────────────────────────────────────────
export function useContactTags(contactId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["contact-tags", workspaceId, contactId],
    queryFn: async (): Promise<ContactTag[]> => {
      if (!workspaceId || !contactId) return [];
      const { data, error } = await supabase
        .from("contact_tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactTag[];
    },
    enabled: !!workspaceId && !!contactId,
  });
}

export function useCreateContactTag() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contact_id, tag }: { contact_id: string; tag: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("contact_tags")
        .insert({ workspace_id: workspaceId, contact_id, tag })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contact-tags", workspaceId, vars.contact_id] });
    },
  });
}

export function useDeleteContactTag() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("contact_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contact-tags", workspaceId, vars.contactId] });
    },
  });
}

// ── All workspace tags (for autocomplete) ───────────────────────────────
export function useAllContactTags() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["all-contact-tags", workspaceId],
    queryFn: async (): Promise<string[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("contact_tags")
        .select("tag")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return [...new Set((data ?? []).map((d: any) => d.tag))];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

// ── Contact Emails (from inbox_emails via contact_id) ───────────────────
export function useContactEmails(contactId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["contact-emails", workspaceId, contactId],
    queryFn: async () => {
      if (!workspaceId || !contactId) return [];
      const { data, error } = await supabase
        .from("inbox_emails")
        .select("id, subject, preview, from_email, to_recipients, received_at, is_read")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("received_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId && !!contactId,
  });
}
