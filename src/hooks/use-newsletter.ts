import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";

export interface PublishedVideo {
  id: number;
  title: string;
  youtube_video_id: string | null;
  status: string;
  published_at: string | null;
  description: string | null;
  created_at: string;
}

export interface NewsletterDraft {
  id: string;
  workspace_id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  video_queue_id: number | null;
  created_at: string;
}

export interface NewsletterStats {
  totalDrafts: number;
  totalSent: number;
  videosWithoutNewsletter: PublishedVideo[];
  videosWithNewsletter: PublishedVideo[];
}

export function useNewsletter() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  // Fetch published videos from video_queue
  const videosQuery = useQuery({
    queryKey: ["newsletter-videos", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue" as any)
        .select("id, title, status, description, created_at")
        .eq("workspace_id", workspaceId!)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((v: any) => ({ ...v, youtube_video_id: null, published_at: null })) as unknown as PublishedVideo[];
    },
    enabled: !!workspaceId,
  });

  // Fetch existing newsletter drafts from email_sequences
  const draftsQuery = useQuery({
    queryKey: ["newsletter-drafts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_sequences" as any)
        .select("id, workspace_id, name, subject, body, status, video_queue_id, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NewsletterDraft[];
    },
    enabled: !!workspaceId,
  });

  // Compute newsletter stats
  const stats = useMemo((): NewsletterStats => {
    const videos = videosQuery.data ?? [];
    const drafts = draftsQuery.data ?? [];
    const draftVideoIds = new Set(drafts.map((d) => d.video_queue_id).filter(Boolean));

    return {
      totalDrafts: drafts.filter((d) => d.status === "draft").length,
      totalSent: drafts.filter((d) => d.status === "sent" || d.status === "active").length,
      videosWithoutNewsletter: videos.filter((v) => !draftVideoIds.has(v.id)),
      videosWithNewsletter: videos.filter((v) => draftVideoIds.has(v.id)),
    };
  }, [videosQuery.data, draftsQuery.data]);

  // Generate newsletter draft
  const generateNewsletter = useMutation({
    mutationFn: async (video: PublishedVideo) => {
      const videoUrl = video.youtube_video_id
        ? `https://youtube.com/watch?v=${video.youtube_video_id}`
        : "#";

      const body = `Hi there!\n\nI just published a new video: "${video.title}"\n\n${
        video.description
          ? `Here's what we cover:\n${video.description.slice(0, 300)}${video.description.length > 300 ? "..." : ""}\n\n`
          : ""
      }Watch it here: ${videoUrl}\n\nLet me know what you think in the comments!\n\nThanks for being part of this community.`;

      const subject = `New Video: ${video.title}`;

      const { data, error } = await supabase
        .from("email_sequences" as any)
        .insert({
          workspace_id: workspaceId,
          name: `Newsletter: ${video.title}`,
          subject,
          body,
          status: "draft",
          video_queue_id: video.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-drafts"] });
    },
  });

  return {
    publishedVideos: videosQuery.data ?? [],
    drafts: draftsQuery.data ?? [],
    stats,
    isLoading: videosQuery.isLoading || draftsQuery.isLoading,
    generateNewsletter,
  };
}
