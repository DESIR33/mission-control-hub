import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface EmailSendLog {
  id: string;
  workspace_id: string;
  sequence_id: string;
  enrollment_id: string;
  contact_id: string;
  step_number: number;
  subject: string;
  body: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  message_id: string | null;
}

export interface SequenceDeliveryStats {
  sequenceId: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
}

export function useEmailSendLogs(sequenceId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["email-send-logs", workspaceId, sequenceId],
    queryFn: async (): Promise<EmailSendLog[]> => {
      let query = supabase
        .from("email_send_logs" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("sent_at", { ascending: false });
      if (sequenceId) query = query.eq("sequence_id", sequenceId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as EmailSendLog[];
    },
    enabled: !!workspaceId,
  });
}

export function useSequenceDeliveryStats(sequenceId?: string) {
  const { data: logs, isLoading, error } = useEmailSendLogs(sequenceId);

  const stats: SequenceDeliveryStats | null =
    logs && sequenceId
      ? (() => {
          const totalSent = logs.length;
          const delivered = logs.filter(
            (l) => l.status !== "failed" && l.status !== "bounced"
          ).length;
          const opened = logs.filter(
            (l) => l.status === "opened" || l.status === "clicked"
          ).length;
          const clicked = logs.filter((l) => l.status === "clicked").length;
          const bounced = logs.filter((l) => l.status === "bounced").length;
          const failed = logs.filter((l) => l.status === "failed").length;
          return {
            sequenceId,
            totalSent,
            delivered,
            opened,
            clicked,
            bounced,
            failed,
            openRate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
            clickRate: totalSent > 0 ? (clicked / totalSent) * 100 : 0,
          };
        })()
      : null;

  return { data: stats, isLoading, error };
}

export function useTriggerSequenceSend() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sequenceId: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "send-sequence-email",
        {
          body: { workspace_id: workspaceId, sequence_id: sequenceId },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, sequenceId) => {
      toast.success("Sequence emails triggered successfully!");
      queryClient.invalidateQueries({
        queryKey: ["email-send-logs", workspaceId, sequenceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sequence-enrollments", workspaceId, sequenceId],
      });
    },
    onError: (err: Error) => {
      toast.error(`Failed to send sequence emails: ${err.message}`);
    },
  });
}

export function useSendTestEmail() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      sequenceId,
      testEmail,
    }: {
      sequenceId: string;
      testEmail: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "send-sequence-email",
        {
          body: {
            workspace_id: workspaceId,
            sequence_id: sequenceId,
            test: true,
            test_email: testEmail,
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Test email sent!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to send test email: ${err.message}`);
    },
  });
}
