import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoRepurpose {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  repurpose_type: string;
  status: string;
  url: string | null;
  published_at: string | null;
  views: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useVideoRepurposes(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const qk = ["video-repurposes", workspaceId, youtubeVideoId];

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_repurposes" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("youtube_video_id", youtubeVideoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VideoRepurpose[];
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<VideoRepurpose>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("video_repurposes" as any)
        .insert({
          workspace_id: workspaceId,
          youtube_video_id: youtubeVideoId,
          created_by: user?.id,
          ...item,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<VideoRepurpose>) => {
      const { data, error } = await supabase
        .from("video_repurposes" as any)
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
        .from("video_repurposes" as any)
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  return { repurposes: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}
