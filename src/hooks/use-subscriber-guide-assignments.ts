import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface GuideAssignment {
  id: string;
  workspace_id: string;
  subscriber_id: string;
  guide_id: string;
  downloaded_at: string | null;
  created_at: string;
  // joined
  guide_name?: string;
  guide_slug?: string;
}

export function useSubscriberGuideAssignments(subscriberId: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-guide-assignments", workspaceId, subscriberId],
    queryFn: async (): Promise<GuideAssignment[]> => {
      if (!workspaceId || !subscriberId) return [];

      const { data, error } = await supabase
        .from("subscriber_guide_assignments" as any)
        .select("id, workspace_id, subscriber_id, guide_id, downloaded_at, created_at, subscriber_guides(name, slug)")
        .eq("subscriber_id", subscriberId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data as any[]) ?? []).map((row) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        subscriber_id: row.subscriber_id,
        guide_id: row.guide_id,
        downloaded_at: row.downloaded_at,
        created_at: row.created_at,
        guide_name: row.subscriber_guides?.name,
        guide_slug: row.subscriber_guides?.slug,
      }));
    },
    enabled: !!workspaceId && !!subscriberId,
  });
}

export function useAssignGuide() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriberId, guideId }: { subscriberId: string; guideId: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_guide_assignments" as any)
        .insert({ workspace_id: workspaceId, subscriber_id: subscriberId, guide_id: guideId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-guide-assignments", workspaceId, variables.subscriberId] });
    },
  });
}

export function useUnassignGuide() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, subscriberId }: { id: string; subscriberId: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscriber_guide_assignments" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-guide-assignments", workspaceId, variables.subscriberId] });
    },
  });
}
