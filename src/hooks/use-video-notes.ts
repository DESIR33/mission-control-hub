import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoNote {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  title: string;
  content_md: string;
  post_mortem_json: {
    hook_used?: string;
    target_persona?: string;
    title_hypothesis?: string;
    thumbnail_hypothesis?: string;
    what_worked?: string;
    what_didnt?: string;
    next_video_ideas?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useVideoNotes(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["video-notes", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoNote | null> => {
      if (!workspaceId || !youtubeVideoId) return null;
      const { data, error } = await supabase
        .from("video_notes" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });

  const upsert = useMutation({
    mutationFn: async (updates: {
      content_md?: string;
      post_mortem_json?: VideoNote["post_mortem_json"];
      title?: string;
    }) => {
      if (!workspaceId || !youtubeVideoId) throw new Error("Missing context");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("video_notes" as any)
        .upsert(
          {
            workspace_id: workspaceId,
            youtube_video_id: youtubeVideoId,
            created_by: user.id,
            ...updates,
          } as any,
          { onConflict: "workspace_id,youtube_video_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-notes", workspaceId, youtubeVideoId] });
      queryClient.invalidateQueries({ queryKey: ["video-notes-check", workspaceId] });
    },
  });

  return { note: query.data, isLoading: query.isLoading, upsert };
}

/** Check which videos have notes (for indicators on the list) */
export function useVideoNotesCheck() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-notes-check", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_notes" as any)
        .select("youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const set = new Set((data as any[])?.map((d: any) => d.youtube_video_id) ?? []);
      return set;
    },
    enabled: !!workspaceId,
  });
}
