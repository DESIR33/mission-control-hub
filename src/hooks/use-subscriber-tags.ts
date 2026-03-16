import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberTag } from "@/types/subscriber";

export function useSubscriberTags() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-tags", workspaceId],
    queryFn: async (): Promise<SubscriberTag[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscriber_tags" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return (data ?? []) as unknown as SubscriberTag[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSubscriberTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: { name: string; color?: string; auto_rule?: Record<string, unknown> }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_tags" as any)
        .insert({ ...tag, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-tags", workspaceId] });
    },
  });
}

export function useDeleteSubscriberTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscriber_tags" as any)
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-tags", workspaceId] });
    },
  });
}

export function useSubscriberTagAssignments(subscriberId: string | null) {
  return useQuery({
    queryKey: ["subscriber-tag-assignments", subscriberId],
    queryFn: async (): Promise<string[]> => {
      if (!subscriberId) return [];

      const { data, error } = await supabase
        .from("subscriber_tag_assignments" as any)
        .select("tag_id")
        .eq("subscriber_id", subscriberId);

      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => r.tag_id as string);
    },
    enabled: !!subscriberId,
  });
}

export function useToggleSubscriberTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriberId, tagId, assigned }: { subscriberId: string; tagId: string; assigned: boolean }) => {
      if (assigned) {
        const { error } = await supabase
          .from("subscriber_tag_assignments" as any)
          .delete()
          .eq("subscriber_id", subscriberId)
          .eq("tag_id", tagId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriber_tag_assignments" as any)
          .insert({ subscriber_id: subscriberId, tag_id: tagId });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-tag-assignments", variables.subscriberId] });
    },
  });
}
