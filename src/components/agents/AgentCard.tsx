import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Swords,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
} from "lucide-react";
import type { AgentDefinition, AgentExecution } from "@/types/agents";
import { AGENT_COLORS } from "@/types/agents";

const iconMap: Record<string, React.ElementType> = {
  "competitor-analyst": Swords,
  "content-strategist": Lightbulb,
  "growth-optimizer": TrendingUp,
  "audience-analyst": Users,
  "revenue-optimizer": DollarSign,
};

interface AgentCardProps {
  agent: AgentDefinition;
  lastExecution?: AgentExecution;
  onRun: (agent: AgentDefinition) => void;
  onToggle: (agent: AgentDefinition, enabled: boolean) => void;
  onViewDetail: (agent: AgentDefinition) => void;
  isRunning?: boolean;
}

export function AgentCard({
  agent,
  lastExecution,
  onRun,
  onToggle,
  onViewDetail,
  isRunning,
}: AgentCardProps) {
  const Icon = iconMap[agent.slug] || Bot;
  const colorClass = AGENT_COLORS[agent.slug] || "text-muted-foreground";
  const schedule = agent.config?.schedule || "manual";

  const statusIcon = () => {
    if (isRunning) return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
    if (!lastExecution) return <Clock className="h-3 w-3 text-muted-foreground" />;
    if (lastExecution.status === "completed")
      return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    if (lastExecution.status === "failed")
      return <XCircle className="h-3 w-3 text-red-400" />;
    if (lastExecution.status === "running")
      return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const lastRunLabel = () => {
    if (isRunning) return "Running now...";
    if (!lastExecution) return "Never run";
    const d = new Date(lastExecution.completed_at || lastExecution.created_at);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
      onClick={() => onViewDetail(agent)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-card border border-border ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {statusIcon()}
                <span className="text-xs text-muted-foreground">{lastRunLabel()}</span>
              </div>
            </div>
          </div>
          <Switch
            checked={agent.enabled}
            onCheckedChange={(checked) => {
              onToggle(agent, checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {agent.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {schedule}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {agent.skills.length} skills
            </Badge>
            {lastExecution?.proposals_created ? (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {lastExecution.proposals_created} proposals
              </Badge>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isRunning}
            onClick={(e) => {
              e.stopPropagation();
              onRun(agent);
            }}
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
