import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface YouTubeLead {
  id: string;
  comment_id: string;
  video_id: string;
  video_title: string | null;
  author_channel_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  author_subscriber_count: number;
  comment_text: string;
  detected_intent: string;
  processed: boolean;
  dismissed: boolean;
  contact_id: string | null;
  created_at: string;
}

export function useYoutubeLeads() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-leads", workspaceId],
    queryFn: async (): Promise<YouTubeLead[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("youtube_lead_comments" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeLead[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateLeadContact() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: YouTubeLead) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      // Create contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          workspace_id: workspaceId,
          first_name: lead.author_name?.split(" ")[0] || "Unknown",
          last_name: lead.author_name?.split(" ").slice(1).join(" ") || null,
          source: "youtube_comment",
          social_youtube: lead.author_channel_id
            ? `https://youtube.com/channel/${lead.author_channel_id}`
            : null,
          avatar_url: lead.author_avatar_url,
          status: "lead",
          notes: `Detected via YouTube comment (${lead.detected_intent}): "${lead.comment_text.substring(0, 200)}"`,
          created_by: user?.id,
          enrichment_youtube: {
            channel_id: lead.author_channel_id,
            subscriber_count: lead.author_subscriber_count,
            source_video_id: lead.video_id,
            source_video_title: lead.video_title,
            detected_intent: lead.detected_intent,
          },
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Mark lead as processed
      await supabase
        .from("youtube_lead_comments" as any)
        .update({ processed: true, contact_id: contact.id } as any)
        .eq("id", lead.id);

      return contact;
    },
    onSuccess: () => {
      toast.success("Contact created from YouTube lead!");
      queryClient.invalidateQueries({ queryKey: ["youtube-leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });
}

export function useDismissLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("youtube_lead_comments" as any)
        .update({ dismissed: true } as any)
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-leads"] });
    },
  });
}

export function useScanForLeads() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "youtube-comments-sync",
        {
          body: { workspace_id: workspaceId, scan_for_leads: true },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const count = (data as Record<string, unknown>)?.leads_found ?? 0;
      toast.success(
        `Scan complete! Found ${count} new lead${count !== 1 ? "s" : ""}`
      );
      queryClient.invalidateQueries({ queryKey: ["youtube-leads"] });
    },
    onError: (err: Error) => {
      toast.error(`Scan failed: ${err.message}`);
    },
  });
}
