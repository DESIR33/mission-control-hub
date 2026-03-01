import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoExperiment {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  experiment_type: "title" | "thumbnail";
  variant_a: string;
  variant_b: string;
  started_at: string | null;
  ended_at: string | null;
  ctr_before: number;
  ctr_after: number;
  winner: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useVideoExperiments(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const qk = ["video-experiments", workspaceId, youtubeVideoId];

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_experiments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("youtube_video_id", youtubeVideoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VideoExperiment[];
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });

  const create = useMutation({
    mutationFn: async (exp: Partial<VideoExperiment>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("video_experiments" as any)
        .insert({
          workspace_id: workspaceId,
          youtube_video_id: youtubeVideoId,
          created_by: user?.id,
          ...exp,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<VideoExperiment>) => {
      const { data, error } = await supabase
        .from("video_experiments" as any)
        .update(updates as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("video_experiments" as any)
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  return { experiments: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}
