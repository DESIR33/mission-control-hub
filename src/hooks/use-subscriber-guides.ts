import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberGuide } from "@/types/subscriber";

export function useSubscriberGuides() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-guides", workspaceId],
    queryFn: async (): Promise<SubscriberGuide[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscriber_guides" as any)
        .select("*, video_queue(title), companies(name, logo_url)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data as any[]) ?? []).map((row) => ({
        ...row,
        video_title: row.video_queue?.title ?? null,
        company_name: row.companies?.name ?? null,
        company_logo_url: row.companies?.logo_url ?? null,
      })) as unknown as SubscriberGuide[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSubscriberGuide() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guide: {
      name: string;
      slug: string;
      description?: string;
      delivery_type?: 'email' | 'redirect';
      file_url?: string;
      email_subject?: string;
      email_body?: string;
      video_queue_id?: number;
      company_id?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_guides" as any)
        .insert({ ...guide, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-guides", workspaceId] });
    },
  });
}

export function useUpdateSubscriberGuide() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      delivery_type?: 'email' | 'redirect';
      file_url?: string;
      email_subject?: string;
      email_body?: string;
      status?: 'active' | 'inactive';
      video_queue_id?: number | null;
      company_id?: string | null;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_guides" as any)
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-guides", workspaceId] });
    },
  });
}

export function useDeleteSubscriberGuide() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscriber_guides" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-guides", workspaceId] });
    },
  });
}
