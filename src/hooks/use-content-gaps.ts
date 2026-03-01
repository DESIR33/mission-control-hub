import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface ContentGap {
  id: string;
  workspace_id: string;
  topic: string;
  search_volume: string | null;
  competition: "low" | "medium" | "high" | null;
  relevance_score: number | null;
  source: string | null;
  status: "identified" | "planned" | "in_production" | "published" | "dismissed";
  video_queue_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useContentGaps() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["content-gaps", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_gaps" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContentGap[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateContentGap() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gap: Partial<ContentGap>) => {
      const { data, error } = await supabase
        .from("content_gaps" as any)
        .insert({ ...gap, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-gaps"] }),
  });
}

export function useUpdateContentGap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentGap> & { id: string }) => {
      const { data, error } = await supabase
        .from("content_gaps" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-gaps"] }),
  });
}

export function useDeleteContentGap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_gaps" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-gaps"] }),
  });
}
