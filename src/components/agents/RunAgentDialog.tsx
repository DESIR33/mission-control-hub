import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play } from "lucide-react";
import type { AgentDefinition } from "@/types/agents";

interface RunAgentDialogProps {
  agent: AgentDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (agentSlug: string, message: string) => void;
  isRunning: boolean;
}

const DEFAULT_PROMPTS: Record<string, string> = {
  "competitor-analyst":
    "Analyze my competitors. Check their recent uploads, subscriber changes, and identify any content gaps I should exploit.",
  "content-strategist":
    "Review my recent video performance and suggest 5 new video topics that would maximize growth based on what's working.",
  "growth-optimizer":
    "Analyze my growth trajectory. Am I on pace for my subscriber goals? What are the top 3 things I should do to accelerate growth?",
  "audience-analyst":
    "Analyze my recent comments and audience engagement. What are the top recurring themes, questions, and sentiment trends?",
  "revenue-optimizer":
    "Review my sponsorship pipeline and affiliate performance. Identify stale deals and new monetization opportunities.",
};

export function RunAgentDialog({
  agent,
  open,
  onOpenChange,
  onRun,
  isRunning,
}: RunAgentDialogProps) {
  const [message, setMessage] = useState("");

  const effectiveMessage =
    message.trim() || (agent ? DEFAULT_PROMPTS[agent.slug] || "" : "");

  const handleRun = () => {
    if (!agent || !effectiveMessage) return;
    onRun(agent.slug, effectiveMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Run {agent?.name}</DialogTitle>
          <DialogDescription>
            {agent?.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder={agent ? DEFAULT_PROMPTS[agent.slug] : "Enter a task for the agent..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the default prompt. The agent will analyze your data and create proposals in AI Bridge.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={isRunning || !effectiveMessage}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
