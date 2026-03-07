import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { VideoRepurpose } from "@/hooks/use-video-repurposes";

export const REPURPOSE_PLATFORMS = [
  { id: "youtube_shorts", label: "YouTube Shorts", format: "Short-form vertical video (< 60s)" },
  { id: "tiktok", label: "TikTok", format: "Short-form vertical video with hook" },
  { id: "ig_reels", label: "Instagram Reels", format: "Short-form vertical video (< 90s)" },
  { id: "twitter_thread", label: "Twitter/X Thread", format: "Text thread with key takeaways" },
  { id: "linkedin_post", label: "LinkedIn Post", format: "Professional insight post" },
  { id: "ig_carousel", label: "Instagram Carousel", format: "Multi-slide visual carousel" },
] as const;

export type RepurposePlatform = typeof REPURPOSE_PLATFORMS[number]["id"];

export const REPURPOSE_STATUSES = ["draft", "scheduled", "published", "tracked"] as const;
export type RepurposeStatus = typeof REPURPOSE_STATUSES[number];

export function useRepurposingWorkflow(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const qk = ["repurposing-workflow", workspaceId, youtubeVideoId];

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

  const repurposes = query.data ?? [];

  // Coverage score
  const coverageScore = useMemo(() => {
    const publishedPlatforms = new Set<string>();
    for (const r of repurposes) {
      if (r.status === "published") {
        publishedPlatforms.add(r.repurpose_type);
      }
    }
    return {
      published: publishedPlatforms.size,
      total: REPURPOSE_PLATFORMS.length,
      percentage: Math.round((publishedPlatforms.size / REPURPOSE_PLATFORMS.length) * 100),
    };
  }, [repurposes]);

  // Generate suggestions for all platforms
  const generateSuggestions = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !youtubeVideoId) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();

      // Determine which platforms already have entries
      const existingTypes = new Set(repurposes.map((r) => r.repurpose_type));

      const newEntries = REPURPOSE_PLATFORMS
        .filter((p) => !existingTypes.has(p.id))
        .map((p) => ({
          workspace_id: workspaceId,
          youtube_video_id: youtubeVideoId,
          repurpose_type: p.id,
          status: "draft",
          notes: p.format,
          views: 0,
          created_by: user?.id,
        }));

      if (newEntries.length === 0) return [];

      const { data, error } = await supabase
        .from("video_repurposes" as any)
        .insert(newEntries as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
    },
  });

  // Update repurpose item
  const updateItem = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
    },
  });

  // Remove item
  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("video_repurposes" as any)
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
    },
  });

  return {
    repurposes,
    isLoading: query.isLoading,
    coverageScore,
    generateSuggestions,
    updateStatus,
    updateItem,
    removeItem,
  };
}
