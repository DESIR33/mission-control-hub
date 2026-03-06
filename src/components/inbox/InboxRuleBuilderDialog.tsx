import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCsrf } from "@/lib/csrf";
import axios from "@/lib/axios-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WandSparklesIcon, Loader2Icon } from "lucide-react";

interface InboxAutomationCandidate {
  id: string;
  title: string;
  actionType: "move" | "archive" | "reply" | "tag" | "assign";
  pattern: {
    senderEmail?: string | null;
    senderDomain?: string | null;
    subject?: string | null;
    topic?: string | null;
  };
  confidence: number;
  repeatedCount: number;
  impact: "low" | "medium" | "high";
  impactEstimate: {
    estimatedMinutesSavedMonthly: number;
    avoidedManualActionsMonthly: number;
  };
  recommendedMode: "shadow" | "active";
  rollbackWindowMinutes: number;
  lastSeenAt?: string;
}

interface InboxRuleBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changedBy: string;
  suggestedCandidate: InboxAutomationCandidate | null;
}

export default function InboxRuleBuilderDialog({
  open,
  onOpenChange,
  changedBy,
  suggestedCandidate,
}: InboxRuleBuilderDialogProps) {
  const { toast } = useToast();
  const { csrfToken } = useCsrf();
  const queryClient = useQueryClient();

  const [ruleName, setRuleName] = useState("");
  const [senderPattern, setSenderPattern] = useState("");
  const [subjectPattern, setSubjectPattern] = useState("");
  const [actionType, setActionType] = useState<string>("move");
  const [actionValue, setActionValue] = useState("");
  const [executionMode, setExecutionMode] = useState<"shadow" | "active">("shadow");

  useEffect(() => {
    if (suggestedCandidate) {
      setRuleName(suggestedCandidate.title);
      setSenderPattern(suggestedCandidate.pattern.senderEmail || suggestedCandidate.pattern.senderDomain || "");
      setSubjectPattern(suggestedCandidate.pattern.subject || suggestedCandidate.pattern.topic || "");
      setActionType(suggestedCandidate.actionType);
      setExecutionMode(suggestedCandidate.recommendedMode);
    } else {
      setRuleName("");
      setSenderPattern("");
      setSubjectPattern("");
      setActionType("move");
      setActionValue("");
      setExecutionMode("shadow");
    }
  }, [suggestedCandidate]);

  const createRuleMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      conditions: Record<string, string>;
      actionType: string;
      actionValue: string;
      executionMode: string;
      changedBy: string;
    }) => {
      const response = await axios.post("/api/inbox/rules", data, {
        headers: { "X-CSRF-Token": csrfToken || "" },
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Rule created", description: "Your inbox automation rule has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/rules"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create rule",
        description: error?.response?.data?.error || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!ruleName.trim()) {
      toast({ title: "Rule name required", variant: "destructive" });
      return;
    }

    const conditions: Record<string, string> = {};
    if (senderPattern) conditions.senderPattern = senderPattern;
    if (subjectPattern) conditions.subjectPattern = subjectPattern;

    createRuleMutation.mutate({
      name: ruleName,
      conditions,
      actionType,
      actionValue,
      executionMode,
      changedBy,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparklesIcon className="h-5 w-5" />
            Inbox Rule Builder
          </DialogTitle>
          <DialogDescription>
            {suggestedCandidate
              ? `Promoting automation candidate: ${suggestedCandidate.title}`
              : "Create a new inbox automation rule"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Auto-archive newsletters"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-pattern">Sender pattern</Label>
            <Input
              id="sender-pattern"
              value={senderPattern}
              onChange={(e) => setSenderPattern(e.target.value)}
              placeholder="*@newsletter.com or exact@email.com"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-pattern">Subject pattern</Label>
            <Input
              id="subject-pattern"
              value={subjectPattern}
              onChange={(e) => setSubjectPattern(e.target.value)}
              placeholder="Contains 'weekly digest'"
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="action-type">Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move">Move to folder</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="tag">Apply tag</SelectItem>
                  <SelectItem value="assign">Assign to user</SelectItem>
                  <SelectItem value="reply">Auto-reply</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-value">Action value</Label>
              <Input
                id="action-value"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder={actionType === "move" ? "Folder name" : actionType === "tag" ? "Tag name" : "Value"}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="execution-mode">Execution mode</Label>
            <select
              id="execution-mode"
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value as "shadow" | "active")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="shadow">Shadow (dry run)</option>
              <option value="active">Active (live)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Shadow mode shows what would happen without making changes. Use active mode once confident.
            </p>
          </div>

          {suggestedCandidate && (
            <div className="rounded-xl bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-semibold">Candidate context</p>
              <p>Repeated {suggestedCandidate.repeatedCount}x in last 30 days</p>
              <p>Confidence: {Math.round(suggestedCandidate.confidence * 100)}%</p>
              <p>Impact: {suggestedCandidate.impact} · Est. {suggestedCandidate.impactEstimate.estimatedMinutesSavedMonthly} min saved/month</p>
              <p>Rollback window: {suggestedCandidate.rollbackWindowMinutes} minutes</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createRuleMutation.isPending}>
            {createRuleMutation.isPending ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
