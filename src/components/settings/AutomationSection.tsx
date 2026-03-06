import { useState } from "react";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
} from "@/hooks/use-automation-rules";

const RULE_TYPES = [
  { id: "deal_stale", label: "Stale Deal Follow-up", description: "Create reminder when a deal sits in a stage too long" },
  { id: "contact_inactive", label: "Inactive Contact Follow-up", description: "Create reminder when a contact hasn't been contacted recently" },
] as const;

export function AutomationSection() {
  const { data: rules = [], isLoading } = useAutomationRules();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_type: "deal_stale" as string,
    stage: "proposal",
    max_days: 5,
    reminder_title: "Follow up on deal",
  });

  const handleCreate = () => {
    const config: Record<string, unknown> = {};
    if (newRule.rule_type === "deal_stale") {
      config.stage = newRule.stage;
      config.max_days = newRule.max_days;
      config.reminder_title = newRule.reminder_title;
    } else {
      config.max_days_since_contact = newRule.max_days;
      config.reminder_title = newRule.reminder_title;
    }

    createRule.mutate({ rule_type: newRule.rule_type, config }, {
      onSuccess: () => { toast.success("Automation rule created"); setShowAdd(false); },
      onError: () => toast.error("Failed to create rule"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Follow-up Automation
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically create reminders based on deal and contact activity.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Rule
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Rule Type</Label>
            <Select
              value={newRule.rule_type}
              onValueChange={(v) => setNewRule((r) => ({ ...r, rule_type: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newRule.rule_type === "deal_stale" && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Deal Stage</Label>
              <Select
                value={newRule.stage}
                onValueChange={(v) => setNewRule((r) => ({ ...r, stage: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["prospecting", "qualification", "proposal", "negotiation"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              {newRule.rule_type === "deal_stale" ? "Max days in stage" : "Max days since contact"}
            </Label>
            <Input
              type="number"
              min={1}
              value={newRule.max_days}
              onChange={(e) => setNewRule((r) => ({ ...r, max_days: parseInt(e.target.value) || 1 }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Reminder Title</Label>
            <Input
              value={newRule.reminder_title}
              onChange={(e) => setNewRule((r) => ({ ...r, reminder_title: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createRule.isPending}>Create</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No automation rules configured yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const ruleType = RULE_TYPES.find((rt) => rt.id === rule.rule_type);
            const config = rule.config as Record<string, any>;
            return (
              <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                  onClick={() => updateRule.mutate({ id: rule.id, enabled: !rule.enabled }, {
                    onSuccess: () => toast.success(rule.enabled ? "Rule disabled" : "Rule enabled"),
                  })}
                >
                  {rule.enabled
                    ? <ToggleRight className="h-5 w-5 text-primary" />
                    : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  }
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ruleType?.label ?? rule.rule_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.rule_type === "deal_stale"
                      ? `Stage: ${config.stage} / ${config.max_days} days`
                      : `${config.max_days_since_contact} days without contact`}
                    {config.reminder_title && ` — "${config.reminder_title}"`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete rule"
                  onClick={() => deleteRule.mutate(rule.id, {
                    onSuccess: () => toast.success("Rule deleted"),
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
