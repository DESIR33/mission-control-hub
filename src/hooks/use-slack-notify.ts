import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export type SlackNotifyType = "alert" | "briefing" | "approval" | "test" | "custom";

export interface SlackAlertPayload {
  title: string;
  body?: string;
  severity?: "info" | "warning" | "critical";
  link?: string;
}

export interface SlackBriefingPayload {
  title: string;
  sections: Array<{ heading: string; content: string }>;
  date?: string;
}

export interface SlackApprovalPayload {
  title: string;
  description?: string;
  proposal_id: string;
  agent_name?: string;
  confidence?: number;
  proposed_changes?: Record<string, any>;
}

export interface SlackCustomPayload {
  text: string;
  blocks?: any[];
}

type PayloadMap = {
  alert: SlackAlertPayload;
  briefing: SlackBriefingPayload;
  approval: SlackApprovalPayload;
  test: undefined;
  custom: SlackCustomPayload;
};

export function useSlackNotify() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async <T extends SlackNotifyType>(args: {
      type: T;
      payload?: PayloadMap[T];
      channel_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("slack-notify", {
        body: {
          workspace_id: workspaceId,
          type: args.type,
          payload: args.payload,
          channel_id: args.channel_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; ts: string; channel: string };
    },
  });
}
