import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberVideoNotification } from "@/types/subscriber";

export function useSubscriberVideoNotifications() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-video-notifications", workspaceId],
    queryFn: async (): Promise<SubscriberVideoNotification[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscriber_video_notifications" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SubscriberVideoNotification[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateVideoNotification() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      video_id: string;
      video_title?: string;
      video_url?: string;
      thumbnail_url?: string;
      email_subject?: string;
      email_body?: string;
      scheduled_at?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_video_notifications" as any)
        .insert({ ...notification, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-video-notifications", workspaceId] });
    },
  });
}

export function useSendVideoNotification() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase.functions.invoke("notify-subscribers-new-video", {
        body: { workspace_id: workspaceId, notification_id: notificationId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-video-notifications", workspaceId] });
    },
  });
}
