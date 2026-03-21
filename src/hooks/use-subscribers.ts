import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import type { Subscriber, SubscriberStatus, SubscriberSource, SubscriberEngagementData } from "@/types/subscriber";

export function useSubscribers() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscribers", workspaceId],
    queryFn: async (): Promise<Subscriber[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscribers" as any)
        .select("id, workspace_id, email, first_name, last_name, status, source, source_video_id, source_video_title, guide_requested, guide_delivered_at, avatar_url, city, state, country, notes, engagement_score, engagement_data, opt_in_confirmed, opt_in_confirmed_at, promoted_to_contact_id, custom_fields, page_url, referrer, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return ((data as any[]) ?? []).map((row) => ({
        ...row,
        status: row.status as SubscriberStatus,
        source: row.source as SubscriberSource | null,
        custom_fields: (row.custom_fields as Record<string, unknown>) ?? {},
        engagement_data: (row.engagement_data as SubscriberEngagementData) ?? {
          emails_sent: 0,
          emails_opened: 0,
          emails_clicked: 0,
          guides_downloaded: 0,
          last_email_opened_at: null,
          last_clicked_at: null,
        },
      }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useSubscriber(id: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber", workspaceId, id],
    queryFn: async (): Promise<Subscriber | null> => {
      if (!workspaceId || !id) return null;

      const { data, error } = await supabase
        .from("subscribers" as any)
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      if (!data) return null;

      const row = data as any;
      return {
        ...row,
        status: row.status as SubscriberStatus,
        source: row.source as SubscriberSource | null,
        custom_fields: (row.custom_fields as Record<string, unknown>) ?? {},
        engagement_data: (row.engagement_data as SubscriberEngagementData) ?? {
          emails_sent: 0,
          emails_opened: 0,
          emails_clicked: 0,
          guides_downloaded: 0,
          last_email_opened_at: null,
          last_clicked_at: null,
        },
      };
    },
    enabled: !!workspaceId && !!id,
    staleTime: 120_000,
  });
}

export function useCreateSubscriber() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriber: {
      email: string;
      first_name?: string;
      last_name?: string;
      status?: SubscriberStatus;
      source?: SubscriberSource;
      source_video_id?: string;
      source_video_title?: string;
      guide_requested?: string;
      avatar_url?: string;
      city?: string;
      state?: string;
      country?: string;
      notes?: string;
      opt_in_confirmed?: boolean;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscribers" as any)
        .insert({
          ...subscriber,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
    },
  });
}

export function useUpdateSubscriber() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      status?: SubscriberStatus;
      source?: SubscriberSource;
      source_video_id?: string;
      source_video_title?: string;
      guide_requested?: string;
      guide_delivered_at?: string;
      avatar_url?: string;
      city?: string;
      state?: string;
      country?: string;
      notes?: string;
      engagement_score?: number;
      engagement_data?: SubscriberEngagementData;
      opt_in_confirmed?: boolean;
      opt_in_confirmed_at?: string;
      promoted_to_contact_id?: string;
      custom_fields?: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscribers" as any)
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["subscriber", workspaceId, variables.id] });
    },
  });
}

export function useDeleteSubscriber() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscribers" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
    },
  });
}

export function useBulkDeleteSubscribers() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscribers" as any)
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
    },
  });
}
