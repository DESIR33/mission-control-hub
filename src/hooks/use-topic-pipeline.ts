import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TopicPipelineImpact {
  id: string;
  workspace_id: string;
  topic: string;
  issues_count: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  leads_generated: number;
  deals_generated: number;
  pipeline_value: number;
  closed_revenue: number;
  avg_open_rate: number;
  avg_click_rate: number;
  revenue_per_send: number;
  pipeline_per_send: number;
  last_calculated_at: string;
}

export function useTopicPipelineImpact() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["topic-pipeline-impact", workspaceId],
    queryFn: async (): Promise<TopicPipelineImpact[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("newsletter_topic_pipeline" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("closed_revenue", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TopicPipelineImpact[];
    },
    enabled: !!workspaceId,
  });
}

export function useRecalculateTopicPipeline() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.rpc("recalculate_topic_pipeline" as any, {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic-pipeline-impact", workspaceId] });
    },
  });
}

export interface ClickEvent {
  id: string;
  issue_id: string;
  subscriber_email: string;
  event_type: string;
  link_url: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
}

export function useNewsletterClickEvents(issueId: string | null) {
  return useQuery({
    queryKey: ["newsletter-click-events", issueId],
    queryFn: async (): Promise<ClickEvent[]> => {
      if (!issueId) return [];
      const { data, error } = await supabase
        .from("newsletter_click_events" as any)
        .select("*")
        .eq("issue_id", issueId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClickEvent[];
    },
    enabled: !!issueId,
  });
}
