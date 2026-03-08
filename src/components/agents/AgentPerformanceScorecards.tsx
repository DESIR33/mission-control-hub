import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useAgentPerformanceStats } from "@/hooks/use-agent-scorecards";
import { useAgents } from "@/hooks/use-agents";

export function AgentPerformanceScorecards() {
  const { data: stats = [] } = useAgentPerformanceStats();
  const { data: agents = [] } = useAgents();

  const agentNameMap = new Map(agents.map((a) => [a.slug, a.name]));

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Agent Scorecards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No agent feedback data yet. Approve or reject proposals to build scorecards.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Agent Scorecards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.agent_slug} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {agentNameMap.get(stat.agent_slug) ?? stat.agent_slug}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    stat.acceptance_rate >= 70
                      ? "text-green-600 border-green-300"
                      : stat.acceptance_rate >= 40
                      ? "text-amber-600 border-amber-300"
                      : "text-red-600 border-red-300"
                  }
                >
                  {stat.acceptance_rate >= 70 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {stat.acceptance_rate}% accepted
                </Badge>
              </div>
            </div>
            <Progress value={stat.acceptance_rate} className="h-1.5" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{stat.total_proposals} total</span>
              <span className="text-green-600">{stat.accepted} accepted</span>
              <span className="text-red-500">{stat.rejected} rejected</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
