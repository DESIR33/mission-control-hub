import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAgents, useExecutions } from "@/hooks/use-agents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

interface AgentGoal {
  agentSlug: string;
  agentName: string;
  kpi: string;
  target: number;
  current: number;
  unit: string;
  trend: "up" | "down" | "flat";
  weeklyDelta: number;
}

export function AgentGoalTracker() {
  const { data: agents = [] } = useAgents();
  const { data: executions = [] } = useExecutions(30);
  const { workspaceId } = useWorkspace();

  const { data: proposals = [] } = useQuery({
    queryKey: ["agent-goal-proposals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("ai_proposals")
        .select("status, created_by, created_at, type")
        .eq("workspace_id", workspaceId)
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["agent-goal-feedback", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("agent_feedback")
        .select("action, agent_slug, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const goals: AgentGoal[] = agents.map((agent) => {
    const agentExecs = executions.filter((e) => e.agent_slug === agent.slug);
    const agentFeedback = feedback.filter((f) => f.agent_slug === agent.slug);
    const accepted = agentFeedback.filter((f) => f.action === "accepted").length;
    const total = agentFeedback.length || 1;
    const acceptRate = Math.round((accepted / total) * 100);

    const thisWeek = agentExecs.filter(
      (e) => new Date(e.created_at) > new Date(Date.now() - 7 * 86400000)
    );
    const lastWeek = agentExecs.filter(
      (e) =>
        new Date(e.created_at) > new Date(Date.now() - 14 * 86400000) &&
        new Date(e.created_at) <= new Date(Date.now() - 7 * 86400000)
    );
    const delta = thisWeek.length - lastWeek.length;

    return {
      agentSlug: agent.slug,
      agentName: agent.name,
      kpi: "Proposal Acceptance Rate",
      target: 80,
      current: acceptRate,
      unit: "%",
      trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      weeklyDelta: delta,
    };
  });

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          Agent Goal Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No agents configured</p>
        ) : (
          goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const onTrack = goal.current >= goal.target * 0.7;
            return (
              <div key={goal.agentSlug} className="space-y-2 p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{goal.agentName}</span>
                    <Badge variant={onTrack ? "default" : "destructive"} className="text-xs">
                      {onTrack ? "On Track" : "Behind"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendIcon trend={goal.trend} />
                    <span>{goal.weeklyDelta > 0 ? "+" : ""}{goal.weeklyDelta} this week</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goal.kpi}</span>
                  <span>{goal.current}{goal.unit} / {goal.target}{goal.unit}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
