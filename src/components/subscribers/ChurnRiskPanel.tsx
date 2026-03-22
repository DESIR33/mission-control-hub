import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChurnRiskSubscribers, useRunChurnDetection } from "@/hooks/use-subscriber-churn";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Loader2, TrendingDown, Eye, MousePointer } from "lucide-react";

const riskColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground",
};

export function ChurnRiskPanel() {
  const { data: entries = [], isLoading } = useChurnRiskSubscribers();
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

  const atRisk = entries.filter((e) => e.risk_level === "high" || e.risk_level === "critical");

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Churn Risk Detection
            {atRisk.length > 0 && (
              <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                {atRisk.length} at risk
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleRun} disabled={runDetection.isPending} className="gap-1.5">
            {runDetection.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Run Detection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No churn risk data. Run detection to analyze subscriber engagement.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {entries.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.subscriber_name || entry.subscriber_email || entry.subscriber_id.slice(0, 8)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {entry.declining_opens && (
                      <span className="flex items-center gap-1 text-warning">
                        <TrendingDown className="w-3 h-3" />
                        <Eye className="w-3 h-3" /> declining opens
                      </span>
                    )}
                    {entry.declining_clicks && (
                      <span className="flex items-center gap-1 text-warning">
                        <TrendingDown className="w-3 h-3" />
                        <MousePointer className="w-3 h-3" /> declining clicks
                      </span>
                    )}
                    {entry.days_since_last_open != null && (
                      <span>{entry.days_since_last_open}d since last open</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-xs", riskColors[entry.risk_level])}>
                    {entry.risk_level} ({Math.round(entry.risk_score)})
                  </Badge>
                  {entry.reengagement_status !== "none" && (
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
  );
}
