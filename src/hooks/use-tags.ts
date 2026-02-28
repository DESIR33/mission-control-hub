import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Tag } from "@/types/crm";

export function useTags() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: async (): Promise<Tag[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_id: string;
  entity_type: string;
  created_at: string;
}

export function useEntityTags(
  entityId: string | null,
  entityType: "contact" | "company" | "deal",
) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["entity-tags", workspaceId, entityId, entityType],
    queryFn: async (): Promise<Tag[]> => {
      if (!workspaceId || !entityId) return [];

      const { data, error } = await supabase
        .from("entity_tags")
        .select("*, tags(*)")
        .eq("entity_id", entityId)
        .eq("entity_type", entityType);

      if (error) throw error;

      return (data ?? [])
        .map((row) => row.tags as unknown as Tag)
        .filter(Boolean);
    },
    enabled: !!workspaceId && !!entityId,
  });
}

export function useCreateTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("tags")
        .insert({ workspace_id: workspaceId, name, color })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] });
    },
  });
}

export function useToggleEntityTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tagId,
      entityId,
      entityType,
    }: {
      tagId: string;
      entityId: string;
      entityType: "contact" | "company" | "deal";
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      // Check if the association already exists
      const { data: existing, error: fetchError } = await supabase
        .from("entity_tags")
        .select("id")
        .eq("tag_id", tagId)
        .eq("entity_id", entityId)
        .eq("entity_type", entityType)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Remove the tag
        const { error } = await supabase
          .from("entity_tags")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        return { action: "removed" as const };
      } else {
        // Add the tag
        const { error } = await supabase
          .from("entity_tags")
          .insert({ tag_id: tagId, entity_id: entityId, entity_type: entityType });

        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entity-tags", workspaceId, variables.entityId, variables.entityType],
      });
    },
  });
}

export function useDeleteTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["entity-tags"] });
    },
  });
}
