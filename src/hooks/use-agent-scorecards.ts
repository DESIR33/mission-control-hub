import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AgentScorecard {
  id: string;
  workspace_id: string;
  agent_slug: string;
  period_start: string;
  period_end: string;
  total_proposals: number;
  accepted_proposals: number;
  rejected_proposals: number;
  avg_confidence: number;
  outcomes_tracked: number;
  outcome_success_rate: number;
  created_at: string;
}

export function useAgentScorecards() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["agent-scorecards", workspaceId],
    queryFn: async (): Promise<AgentScorecard[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("agent_scorecards" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("period_start", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AgentScorecard[];
    },
    enabled: !!workspaceId,
  });
}

/** Compute live scorecards from agent_feedback + ai_proposals data */
export function useAgentPerformanceStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["agent-performance-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const [feedbackRes, proposalsRes] = await Promise.all([
        supabase
          .from("agent_feedback")
          .select("agent_slug, action")
          .eq("workspace_id", workspaceId),
        supabase
          .from("ai_proposals")
          .select("created_by, status, confidence, type")
          .eq("workspace_id", workspaceId),
      ]);

      const feedback = (feedbackRes.data ?? []) as any[];
      const proposals = (proposalsRes.data ?? []) as any[];

      // Group feedback by agent
      const agentStats = new Map<string, { accepted: number; rejected: number; total: number }>();
      for (const f of feedback) {
        const slug = f.agent_slug;
        const existing = agentStats.get(slug) ?? { accepted: 0, rejected: 0, total: 0 };
        existing.total++;
        if (f.action === "accepted" || f.action === "approved") existing.accepted++;
        if (f.action === "rejected" || f.action === "dismissed") existing.rejected++;
        agentStats.set(slug, existing);
      }

      return Array.from(agentStats.entries()).map(([slug, stats]) => ({
        agent_slug: slug,
        total_proposals: stats.total,
        accepted: stats.accepted,
        rejected: stats.rejected,
        acceptance_rate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
      }));
    },
    enabled: !!workspaceId,
  });
}
