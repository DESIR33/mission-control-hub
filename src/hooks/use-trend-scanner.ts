import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface VideoIdea {
  title: string;
  tool_name: string;
  type: string;
  description: string;
  estimated_views: number;
  content_ideas: string[];
  urgency: string;
  source_tweets: Array<{ author: string; text: string; likes: number; impressions: number }>;
}

export interface TrendReport {
  id: string;
  title: string;
  description: string | null;
  status: string;
  content: {
    ideas: VideoIdea[];
    scan_time: string;
    tweets_total: number;
    tweets_analyzed: number;
    top_tweets: any[];
  };
  metadata: {
    source: string;
    list_id: string;
    scan_window_hours: number;
    ideas_count: number;
  };
  created_at: string;
}

export function useTrendReports() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["trend-reports", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_proposals")
        .select("id, title, description, status, content, metadata, created_at")
        .eq("workspace_id", workspaceId!)
        .eq("proposal_type", "x_trend_scan")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as TrendReport[];
    },
  });
}

export function useTriggerScan() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("x-list-scanner", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["trend-reports", workspaceId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Scan complete! ${data.ideas_count} video ideas found from ${data.tweets_fetched} tweets.`);
    },
    onError: (err: Error) => {
      toast.error(`Scan failed: ${err.message}`);
    },
  });
}

export function useConvertToVideoIdea() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (idea: VideoIdea) => {
      if (!workspaceId) throw new Error("No workspace");

      const metadata: Record<string, unknown> = {
        checklists: [],
        platforms: ["youtube"],
        isSponsored: false,
        companyId: null,
        sponsoringCompanyId: null,
        scriptContent: null,
        source: "x_trend_scanner",
        tool_name: idea.tool_name,
        content_ideas: idea.content_ideas,
        source_tweets: idea.source_tweets,
        estimated_views: idea.estimated_views,
      };

      const { error } = await supabase.from("video_queue" as any).insert({
        workspace_id: workspaceId,
        title: idea.title,
        description: `**${idea.type}**: ${idea.description}\n\n**Tool/Product**: ${idea.tool_name}\n\n**Content Ideas**:\n${idea.content_ideas.map((c) => `• ${c}`).join("\n")}`,
        status: "idea",
        priority: idea.urgency === "high" ? "high" : idea.urgency === "medium" ? "medium" : "low",
        metadata: metadata as any,
      } as any);

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        title: `📹 Video idea added: ${idea.tool_name}`,
        body: idea.title,
        type: "content_pipeline",
        entity_type: "video_queue",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Added to Content Pipeline!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to add: ${err.message}`);
    },
  });
}
