import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface ThumbnailAssessment {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string;
  current_thumbnail_url: string | null;
  assessment_json: Record<string, any>;
  generated_thumbnails: GeneratedThumbnail[];
  competitor_thumbnails: CompetitorThumbnail[];
  selected_variant: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedThumbnail {
  id: string;
  variant: string; // A, B, C, D
  image_url: string;
  prompt: string;
  concept_description: string;
  desire_loop_angle: string;
  created_at: string;
}

export interface CompetitorThumbnail {
  video_id: string;
  title: string;
  thumbnail_url: string;
  views: number;
  channel: string;
}

export function useThumbnailAssessments(youtubeVideoId?: string) {
  const { workspaceId } = useWorkspace();
  const qk = ["thumbnail-assessments", workspaceId, youtubeVideoId];

  return useQuery({
    queryKey: qk,
    queryFn: async () => {
      let query = supabase
        .from("thumbnail_assessments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });

      if (youtubeVideoId) {
        query = query.eq("youtube_video_id", youtubeVideoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ThumbnailAssessment[];
    },
    enabled: !!workspaceId,
  });
}

export function useAssessThumbnail() {
  return useMutation({
    mutationFn: async (args: { video_title: string; current_thumbnail_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("thumbnail-generate", {
        body: {
          action: "assess",
          video_title: args.video_title,
          current_thumbnail_url: args.current_thumbnail_url,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateThumbnail() {
  return useMutation({
    mutationFn: async (args: { prompt: string; model?: string }) => {
      const { data, error } = await supabase.functions.invoke("thumbnail-generate", {
        body: {
          action: "generate",
          prompt: args.prompt,
          model: args.model,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveThumbnailAssessment() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      youtube_video_id: string;
      video_title: string;
      current_thumbnail_url?: string;
      assessment_json?: Record<string, any>;
      generated_thumbnails?: GeneratedThumbnail[];
      competitor_thumbnails?: CompetitorThumbnail[];
      status?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("thumbnail_assessments" as any)
        .insert({
          workspace_id: workspaceId,
          youtube_video_id: args.youtube_video_id,
          video_title: args.video_title,
          current_thumbnail_url: args.current_thumbnail_url || null,
          assessment_json: args.assessment_json || {},
          generated_thumbnails: args.generated_thumbnails || [],
          competitor_thumbnails: args.competitor_thumbnails || [],
          status: args.status || "pending",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thumbnail-assessments"] }),
  });
}

export function useUpdateThumbnailAssessment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string } & Partial<ThumbnailAssessment>) => {
      const { id, ...updates } = args;
      const { data, error } = await supabase
        .from("thumbnail_assessments" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thumbnail-assessments"] }),
  });
}
