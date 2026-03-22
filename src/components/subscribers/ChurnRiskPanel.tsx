import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChurnRiskSubscribers,
  useRunChurnDetection,
  useChurnTierSummary,
  useChurnRecoveryOutcomes,
} from "@/hooks/use-subscriber-churn";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, RefreshCw, Loader2, TrendingDown, TrendingUp,
  Eye, MousePointer, Shield, UserCheck, Users, Zap,
} from "lucide-react";

const riskColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground",
};

const journeyLabels: Record<string, { label: string; icon: string }> = {
  low: { label: "Gentle nudge", icon: "💌" },
  medium: { label: "Re-engage sequence", icon: "📧" },
  high: { label: "Win-back campaign", icon: "🔥" },
  critical: { label: "Urgent recovery", icon: "🚨" },
};

export function ChurnRiskPanel() {
  const { data: entries = [], isLoading } = useChurnRiskSubscribers();
  const { data: outcomes = [] } = useChurnRecoveryOutcomes();
  const tierSummary = useChurnTierSummary();
  const runDetection = useRunChurnDetection();
  const { toast } = useToast();

  const handleRun = async () => {
    try {
      await runDetection.mutateAsync();
      toast({ title: "Churn detection completed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  const latestOutcome = outcomes[0];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">At Risk</p>
                <p className="text-lg font-bold font-mono text-foreground">{tierSummary.totalAtRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Saved</p>
                <p className="text-lg font-bold font-mono text-foreground">{tierSummary.savedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Saved Rate</p>
                <p className="text-lg font-bold font-mono text-foreground">{tierSummary.savedRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Active Journeys</p>
                <p className="text-lg font-bold font-mono text-foreground">{tierSummary.journeysActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Risk Tier Breakdown
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleRun} disabled={runDetection.isPending} className="gap-1.5">
              {runDetection.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Run Detection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(["low", "medium", "high", "critical"] as const).map((tier) => {
              const count = tierSummary.tiers[tier];
              const config = journeyLabels[tier];
              const total = tierSummary.totalAtRisk || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier} className="text-center p-2 rounded-lg bg-secondary/50">
                  <span className="text-lg">{config.icon}</span>
                  <p className="text-xl font-bold font-mono text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{tier} ({pct}%)</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{config.label}</p>
                </div>
              );
            })}
          </div>

          {/* Journey assignment legend */}
          <div className="border border-border rounded-lg p-3 bg-secondary/30">
            <p className="text-xs font-medium text-foreground mb-2">Auto-assigned Re-engagement Journeys</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div><span className="font-medium text-foreground">Low (20-39):</span> 1 gentle nudge after 14 days</div>
              <div><span className="font-medium text-foreground">Medium (40-59):</span> 2-touch sequence after 7 days</div>
              <div><span className="font-medium text-foreground">High (60-79):</span> 3-touch win-back after 3 days</div>
              <div><span className="font-medium text-foreground">Critical (80+):</span> 4-touch urgent recovery, 1 day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Outcomes */}
      {latestOutcome && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Recovery Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Journeys Triggered</p>
                <p className="text-lg font-bold font-mono text-foreground">{latestOutcome.journeys_triggered}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold font-mono text-foreground">{latestOutcome.journeys_completed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subscribers Saved</p>
                <p className="text-lg font-bold font-mono text-success">{latestOutcome.subscribers_saved}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saved Rate</p>
                <p className="text-lg font-bold font-mono text-success">{Number(latestOutcome.saved_rate).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incremental Retained</p>
                <p className="text-lg font-bold font-mono text-primary">{latestOutcome.incremental_retained}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Subscribers */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            At-Risk Subscribers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No churn risk data. Run detection to analyze subscriber engagement.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {entries.slice(0, 30).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.subscriber_name || entry.subscriber_email || entry.subscriber_id.slice(0, 8)}
                      </p>
                      {entry.saved && (
                        <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px]">
                          ✓ Saved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {entry.declining_opens && (
                        <span className="flex items-center gap-1 text-warning">
                          <TrendingDown className="w-3 h-3" />
                          <Eye className="w-3 h-3" /> opens ↓
                        </span>
                      )}
                      {entry.declining_clicks && (
                        <span className="flex items-center gap-1 text-warning">
                          <TrendingDown className="w-3 h-3" />
                          <MousePointer className="w-3 h-3" /> clicks ↓
                        </span>
                      )}
                      {entry.days_since_last_open != null && (
                        <span>{entry.days_since_last_open}d since open</span>
                      )}
                      {entry.journey_tier && entry.journey_tier !== "none" && (
                        <span className="text-primary">
                          {journeyLabels[entry.journey_tier]?.icon} {journeyLabels[entry.journey_tier]?.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-xs", riskColors[entry.risk_level])}>
                      {entry.risk_level} ({Math.round(entry.risk_score)})
                    </Badge>
                    {entry.reengagement_status && entry.reengagement_status !== "none" && (
                      <Badge variant="outline" className="text-[10px]">
                        {entry.reengagement_status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
