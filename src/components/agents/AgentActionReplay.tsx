import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ChevronDown, ChevronRight, Brain, Zap, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useExecutions } from "@/hooks/use-agents";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

interface ReplayStep {
  type: "thought" | "tool_call" | "decision" | "output" | "error";
  label: string;
  detail: string;
  confidence?: number;
  timestamp?: string;
}

function parseExecutionSteps(execution: any): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const input = execution.input as Record<string, any> | null;
  const output = execution.output as Record<string, any> | null;

  steps.push({
    type: "thought",
    label: "Received Input",
    detail: input?.message || JSON.stringify(input || {}).slice(0, 200),
    timestamp: execution.started_at,
  });

  if (output?.tool_calls && Array.isArray(output.tool_calls)) {
    for (const tc of output.tool_calls) {
      steps.push({
        type: "tool_call",
        label: `Called: ${tc.name || tc.function?.name || "unknown"}`,
        detail: JSON.stringify(tc.arguments || tc.function?.arguments || {}).slice(0, 200),
      });
    }
  }

  if (output?.reasoning) {
    steps.push({ type: "thought", label: "Reasoning", detail: String(output.reasoning).slice(0, 300) });
  }

  if (output?.proposals && Array.isArray(output.proposals)) {
    for (const p of output.proposals) {
      steps.push({
        type: "decision",
        label: `Proposal: ${p.title || "Untitled"}`,
        detail: p.summary || p.description || "",
        confidence: p.confidence,
      });
    }
  }

  if (execution.status === "completed") {
    steps.push({
      type: "output",
      label: "Completed",
      detail: `${execution.proposals_created} proposals in ${((execution.duration_ms || 0) / 1000).toFixed(1)}s`,
      timestamp: execution.completed_at,
    });
  } else if (execution.status === "failed") {
    steps.push({ type: "error", label: "Failed", detail: execution.error_message || "Unknown error" });
  }

  return steps;
}

const stepIcons: Record<string, React.ReactNode> = {
  thought: <Brain className="h-3.5 w-3.5 text-blue-500" />,
  tool_call: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  decision: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  output: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const stepColors: Record<string, string> = {
  thought: "border-blue-500/30 bg-blue-500/5",
  tool_call: "border-amber-500/30 bg-amber-500/5",
  decision: "border-green-500/30 bg-green-500/5",
  output: "border-primary/30 bg-primary/5",
  error: "border-destructive/30 bg-destructive/5",
};

export function AgentActionReplay() {
  const { data: executions = [] } = useExecutions(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recentExecutions = executions.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Action Replay
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {recentExecutions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No executions to replay yet.</p>
            )}
            {recentExecutions.map((exec) => {
              const isOpen = expandedId === exec.id;
              const steps = isOpen ? parseExecutionSteps(exec) : [];
              return (
                <div key={exec.id} className="border border-border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : exec.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span className="text-xs font-medium truncate">{exec.agent_slug}</span>
                      <Badge variant={exec.status === "completed" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {exec.status}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {safeFormatDistanceToNow(exec.created_at, { addSuffix: true })}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {steps.map((step, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded border ${stepColors[step.type]}`}>
                          <div className="mt-0.5 shrink-0">{stepIcons[step.type]}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{step.label}</p>
                            <p className="text-[10px] text-muted-foreground break-words">{step.detail}</p>
                            {step.confidence != null && (
                              <Badge variant="outline" className="text-[10px] mt-1">
                                {(step.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
