import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useAutoExecutionRules, useUpsertAutoExecutionRule } from "@/hooks/use-auto-execution";
import { useAgents } from "@/hooks/use-agents";

export function AutoExecutionPipeline() {
  const { data: rules = [] } = useAutoExecutionRules();
  const { data: agents = [] } = useAgents();
  const upsertRule = useUpsertAutoExecutionRule();

  const getRuleForAgent = (slug: string) => rules.find((r) => r.agent_slug === slug);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Auto-Execution Pipeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">High-confidence proposals auto-execute without manual approval.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent) => {
          const rule = getRuleForAgent(agent.slug);
          const threshold = rule?.confidence_threshold ?? 0.9;
          const enabled = rule?.enabled ?? false;

          return (
            <div key={agent.slug} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => upsertRule.mutate({ agent_slug: agent.slug, confidence_threshold: threshold, enabled: checked })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Threshold: {Math.round(threshold * 100)}%</Label>
                  <Slider
                    value={[threshold * 100]}
                    onValueCommit={(v) => upsertRule.mutate({ agent_slug: agent.slug, confidence_threshold: v[0] / 100, enabled })}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                {rule && <p className="text-xs text-muted-foreground">{rule.auto_executed_count} auto-executed</p>}
              </div>
            </div>
          );
        })}
        {agents.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No agents available.</p>}
      </CardContent>
    </Card>
  );
}
