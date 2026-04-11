import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Cpu,
  Zap,
  FileText,
  Trash2,
} from "lucide-react";
import type { AgentDefinition, AgentExecution, AgentSkill } from "@/types/agents";
import { AGENT_COLORS } from "@/types/agents";
import { safeFormat } from "@/lib/date-utils";

interface AgentDetailSheetProps {
  agent: AgentDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executions: AgentExecution[];
  skills: AgentSkill[];
  onDelete?: (agent: AgentDefinition) => void;
}

export function AgentDetailSheet({
  agent,
  open,
  onOpenChange,
  executions,
  skills,
  onDelete,
}: AgentDetailSheetProps) {
  if (!agent) return null;

  const agentSkills = skills.filter((s) => agent.skills.includes(s.slug));
  const colorClass = AGENT_COLORS[agent.slug] || "text-muted-foreground";

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      case "running":
        return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className={colorClass}>{agent.name}</SheetTitle>
          <SheetDescription>{agent.description}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Config */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Configuration
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Model:</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{agent.model}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Schedule:</span>
                  <span>{agent.config?.schedule || "Manual"}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Skills */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Skills ({agentSkills.length})
              </h4>
              <div className="space-y-2">
                {agentSkills.length > 0 ? (
                  agentSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-2 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-amber-400" />
                        <span className="text-sm font-medium">{skill.name}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {skill.skill_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Skills: {agent.skills.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Execution History */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Recent Executions ({executions.length})
              </h4>
              <div className="space-y-2">
                {executions.length > 0 ? (
                  executions.map((exec) => (
                    <div
                      key={exec.id}
                      className="p-2 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(exec.status)}
                          <span className="text-xs capitalize">{exec.status}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {exec.trigger_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {safeFormat(exec.created_at, "Pp")}
                        </span>
                      </div>
                      {exec.proposals_created > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {exec.proposals_created} proposals created
                          </span>
                        </div>
                      )}
                      {exec.duration_ms && (
                        <span className="text-xs text-muted-foreground">
                          Duration: {(exec.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                      {exec.error_message && (
                        <p className="text-xs text-red-400 mt-1">{exec.error_message}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No executions yet.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
