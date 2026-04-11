import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgentLearningPreferences } from "@/hooks/use-agent-learning";
import { useAgentAlertThresholds, useToggleAlertThreshold, useDeleteAlertThreshold } from "@/hooks/use-agent-alert-thresholds";
import { useAgentFeedbackHistory } from "@/hooks/use-agent-feedback";
import { Brain, Bell, Trash2, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Edit2 } from "lucide-react";
import { CreateAlertThresholdDialog } from "./CreateAlertThresholdDialog";
import { safeFormat } from "@/lib/date-utils";

export function AgentLearningPanel({ agentSlug }: { agentSlug?: string }) {
  const { data: preferences = [] } = useAgentLearningPreferences(agentSlug);
  const { data: thresholds = [] } = useAgentAlertThresholds(agentSlug);
  const { data: feedback = [] } = useAgentFeedbackHistory(agentSlug);
  const toggleThreshold = useToggleAlertThreshold();
  const deleteThreshold = useDeleteAlertThreshold();
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const liked = preferences.filter((p) => p.weight > 0);
  const disliked = preferences.filter((p) => p.weight < 0);

  return (
    <Tabs defaultValue="learning" className="space-y-4">
      <TabsList>
        <TabsTrigger value="learning" className="gap-1.5">
          <Brain className="w-3.5 h-3.5" /> Learning
        </TabsTrigger>
        <TabsTrigger value="alerts" className="gap-1.5">
          <Bell className="w-3.5 h-3.5" /> Smart Alerts
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5">
          <Edit2 className="w-3.5 h-3.5" /> Feedback History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="learning" className="space-y-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-success" /> Preferred Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liked.length === 0 ? (
              <p className="text-xs text-muted-foreground">No preferences learned yet. Accept or reject proposals to train the agent.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {liked.map((p) => (
                  <Badge key={p.id} variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    {p.preference_value}
                    <span className="ml-1 text-[10px] opacity-70">×{p.learned_from_count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-destructive" /> Avoided Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disliked.length === 0 ? (
              <p className="text-xs text-muted-foreground">No negative patterns learned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {disliked.map((p) => (
                  <Badge key={p.id} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                    {p.preference_value}
                    <span className="ml-1 text-[10px] opacity-70">×{p.learned_from_count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="alerts" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Configure metric thresholds to trigger agent runs automatically.</p>
          <Button size="sm" onClick={() => setAlertDialogOpen(true)} className="gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Add Alert
          </Button>
        </div>

        {thresholds.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No alert thresholds configured</p>
              <p className="text-xs text-muted-foreground mt-1">Create alerts to trigger agents when metrics change significantly</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {thresholds.map((t) => (
              <Card key={t.id} className="border-border bg-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {t.condition === "drops_below" ? (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-success" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.metric_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.condition === "drops_below" ? "Drops below" : t.condition === "exceeds" ? "Exceeds" : "Changes by"}{" "}
                      {t.threshold_value}{t.condition === "changes_by_percent" ? "%" : ""}
                      {" · "}{t.cooldown_hours}h cooldown
                      {t.trigger_count > 0 && ` · Triggered ${t.trigger_count}×`}
                    </p>
                  </div>
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(enabled) => toggleThreshold.mutate({ id: t.id, enabled })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteThreshold.mutate(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateAlertThresholdDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          agentSlug={agentSlug}
        />
      </TabsContent>

      <TabsContent value="history" className="space-y-2">
        {feedback.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No feedback history yet</p>
            </CardContent>
          </Card>
        ) : (
          feedback.slice(0, 20).map((f) => (
            <Card key={f.id} className="border-border bg-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  f.action === "accepted" ? "bg-success/10" :
                  f.action === "rejected" ? "bg-destructive/10" : "bg-primary/10"
                }`}>
                  {f.action === "accepted" ? <ThumbsUp className="w-4 h-4 text-success" /> :
                   f.action === "rejected" ? <ThumbsDown className="w-4 h-4 text-destructive" /> :
                   <Edit2 className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{f.action}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {f.user_notes || f.agent_slug} · {safeFormat(f.created_at, "P")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
