import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, TrendingDown, Eye, ArrowDownRight, X, Wrench } from "lucide-react";
import { useContentDecayAlerts, useDismissDecayAlert } from "@/hooks/use-video-performance-alerts";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const decayTypeConfig: Record<string, { icon: typeof TrendingDown; label: string; color: string }> = {
  traffic_drop: { icon: TrendingDown, label: "Traffic Drop", color: "text-destructive" },
  ctr_decline: { icon: ArrowDownRight, label: "CTR Decline", color: "text-warning" },
  engagement_drop: { icon: Eye, label: "Engagement Drop", color: "text-orange-500" },
};

export function ContentDecayDetector() {
  const { data: alerts = [], isLoading } = useContentDecayAlerts();
  const dismissAlert = useDismissDecayAlert();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Content Decay Detection
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
              {alerts.length} flagged
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px] px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-6">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No content decay detected. Your evergreen content is performing well!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const config = decayTypeConfig[alert.decay_type] ?? decayTypeConfig.traffic_drop;
                const Icon = config.icon;
                return (
                  <div key={alert.id} className="rounded-lg border border-border p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{alert.video_title || "Untitled Video"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                            {alert.decline_percent != null && (
                              <span className="text-[10px] text-destructive font-medium">
                                {Math.abs(alert.decline_percent).toFixed(0)}% decline
                              </span>
                            )}
                          </div>
                          {alert.suggested_actions && (alert.suggested_actions as string[]).length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium">Suggested:</p>
                              {(alert.suggested_actions as string[]).slice(0, 3).map((action, i) => (
                                <p key={i} className="text-[10px] text-muted-foreground">• {action}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Mark as actioned" onClick={() => dismissAlert.mutate({ id: alert.id, status: "actioned" })}>
                          <Wrench className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Dismiss" onClick={() => dismissAlert.mutate({ id: alert.id, status: "dismissed" })}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {safeFormatDistanceToNow(alert.created_at, { addSuffix: true })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
