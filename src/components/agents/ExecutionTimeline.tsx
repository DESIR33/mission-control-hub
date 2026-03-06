import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Bot,
  Swords,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import type { AgentExecution } from "@/types/agents";

const agentIcons: Record<string, React.ElementType> = {
  "competitor-analyst": Swords,
  "content-strategist": Lightbulb,
  "growth-optimizer": TrendingUp,
  "audience-analyst": Users,
  "revenue-optimizer": DollarSign,
};

const agentNames: Record<string, string> = {
  "competitor-analyst": "Competitor Analyst",
  "content-strategist": "Content Strategist",
  "growth-optimizer": "Growth Optimizer",
  "audience-analyst": "Audience Analyst",
  "revenue-optimizer": "Revenue Optimizer",
};

interface ExecutionTimelineProps {
  executions: AgentExecution[];
  isLoading?: boolean;
}

export function ExecutionTimeline({ executions, isLoading }: ExecutionTimelineProps) {
  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const triggerLabel = (type: string) => {
    switch (type) {
      case "scheduled": return "Scheduled";
      case "chat": return "Chat";
      case "manual": return "Manual";
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No agent activity yet. Run an agent to get started.
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-3">
              {executions.map((exec) => {
                const Icon = agentIcons[exec.agent_slug] || Bot;
                return (
                  <div
                    key={exec.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">{statusIcon(exec.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {agentNames[exec.agent_slug] || exec.agent_slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {triggerLabel(exec.trigger_type)}
                        </Badge>
                        {exec.proposals_created > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {exec.proposals_created} proposals
                          </Badge>
                        )}
                        {exec.duration_ms && (
                          <span className="text-xs text-muted-foreground">
                            {(exec.duration_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      {exec.error_message && (
                        <p className="text-xs text-red-400 mt-1 truncate">
                          {exec.error_message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(exec.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
