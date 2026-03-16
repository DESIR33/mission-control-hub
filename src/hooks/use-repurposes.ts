import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface ContentRepurpose {
  id: string;
  workspace_id: string;
  source_video_id: number;
  platform: string;
  format: string;
  title: string;
  status: "planned" | "in_progress" | "published";
  published_url: string | null;
  published_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRepurposes(sourceVideoId?: number | string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["repurposes", workspaceId, sourceVideoId],
    queryFn: async (): Promise<ContentRepurpose[]> => {
      let query = supabase
        .from("content_repurposes" as any)
        .select("id, workspace_id, source_video_id, platform, format, title, status, published_url, published_at, notes, created_at, updated_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (sourceVideoId) query = query.eq("source_video_id", String(sourceVideoId));
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ContentRepurpose[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useCreateRepurpose() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sourceVideoId: number | string;
      platform: string;
      format: string;
      title: string;
      status?: string;
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("content_repurposes" as any).insert({
        workspace_id: workspaceId,
        source_video_id: Number(input.sourceVideoId),
        platform: input.platform,
        format: input.format,
        title: input.title,
        status: input.status ?? "planned",
        notes: input.notes ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repurposes", workspaceId] }),
  });
}

export function useUpdateRepurpose() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: string;
      published_url?: string;
      published_at?: string;
      title?: string;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.published_url !== undefined) updates.published_url = input.published_url;
      if (input.published_at !== undefined) updates.published_at = input.published_at;
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes;
      const { error } = await supabase.from("content_repurposes" as any).update(updates as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repurposes", workspaceId] }),
  });
}

export function useDeleteRepurpose() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_repurposes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repurposes", workspaceId] }),
  });
}
