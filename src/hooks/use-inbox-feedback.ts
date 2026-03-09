import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface InboxFeedback {
  id: string;
  workspace_id: string;
  email_address: string;
  feedback_type: "irrelevant" | "marketing" | "spam" | "useful";
  source: "conversation_intelligence" | "follow_up_radar";
  created_at: string;
}

export function useInboxFeedback() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const { data: feedbackList = [] } = useQuery<InboxFeedback[]>({
    queryKey: ["inbox-feedback", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("inbox_feedback")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []) as InboxFeedback[];
    },
    enabled: !!workspaceId,
  });

  // Set of emails marked as irrelevant/marketing/spam
  const excludedEmails = new Set(
    feedbackList
      .filter((f) => f.feedback_type !== "useful")
      .map((f) => f.email_address)
  );

  const submitFeedback = useMutation({
    mutationFn: async (payload: {
      email_address: string;
      feedback_type: "irrelevant" | "marketing" | "spam" | "useful";
      source: "conversation_intelligence" | "follow_up_radar";
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      // Upsert so we can change feedback
      const { error } = await query("inbox_feedback").upsert(
        {
          workspace_id: workspaceId,
          email_address: payload.email_address,
          feedback_type: payload.feedback_type,
          source: payload.source,
        },
        { onConflict: "workspace_id,email_address,source" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-feedback"] });
      qc.invalidateQueries({ queryKey: ["conversation-intelligence"] });
      qc.invalidateQueries({ queryKey: ["follow-up-radar"] });
    },
  });

  const removeFeedback = useMutation({
    mutationFn: async (payload: {
      email_address: string;
      source: "conversation_intelligence" | "follow_up_radar";
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("inbox_feedback")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("email_address", payload.email_address)
        .eq("source", payload.source);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-feedback"] });
      qc.invalidateQueries({ queryKey: ["conversation-intelligence"] });
      qc.invalidateQueries({ queryKey: ["follow-up-radar"] });
    },
  });

  return { feedbackList, excludedEmails, submitFeedback, removeFeedback };
}
