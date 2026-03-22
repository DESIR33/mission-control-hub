import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface NewsletterIssue {
  id: string;
  workspace_id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  segment_filter: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  replied_count: number;
  unsubscribed_count: number;
  bounced_count: number;
  conversion_to_lead: number;
  conversion_to_deal: number;
  topic_tags: string[];
  ab_test_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSegmentStat {
  id: string;
  issue_id: string;
  workspace_id: string;
  segment_name: string;
  recipient_count: number;
  open_count: number;
  click_count: number;
  unsubscribe_count: number;
  created_at: string;
}

export interface NewsletterTopicRetention {
  id: string;
  workspace_id: string;
  topic: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_unsubscribed: number;
  avg_open_rate: number;
  avg_click_rate: number;
  retention_score: number;
  last_calculated_at: string;
}

export function useNewsletterIssues() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["newsletter-issues", workspaceId],
    queryFn: async (): Promise<NewsletterIssue[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("newsletter_issues" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        segment_filter: (r.segment_filter as Record<string, unknown>) ?? {},
        topic_tags: (r.topic_tags as string[]) ?? [],
        ab_test_config: r.ab_test_config as Record<string, unknown> | null,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateNewsletterIssue() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      subject: string;
      body?: string;
      topic_tags?: string[];
      scheduled_at?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("newsletter_issues" as any)
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-issues", workspaceId] });
    },
  });
}

export function useUpdateNewsletterIssue() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<NewsletterIssue, "id" | "workspace_id" | "created_at" | "updated_at">>) => {
      const { data, error } = await supabase
        .from("newsletter_issues" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-issues", workspaceId] });
    },
  });
}

export function useNewsletterSegmentStats(issueId: string | null) {
  return useQuery({
    queryKey: ["newsletter-segment-stats", issueId],
    queryFn: async (): Promise<NewsletterSegmentStat[]> => {
      if (!issueId) return [];
      const { data, error } = await supabase
        .from("newsletter_segment_stats" as any)
        .select("*")
        .eq("issue_id", issueId)
        .order("recipient_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NewsletterSegmentStat[];
    },
    enabled: !!issueId,
  });
}

export function useNewsletterTopicRetention() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["newsletter-topic-retention", workspaceId],
    queryFn: async (): Promise<NewsletterTopicRetention[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("newsletter_topic_retention" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("retention_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NewsletterTopicRetention[];
    },
    enabled: !!workspaceId,
  });
}
