import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContentDecayAlerts, useDismissDecayAlert } from "@/hooks/use-video-performance-alerts";
import { useVideoTitleMap } from "@/hooks/use-video-title-map";
import { AlertTriangle, TrendingDown, Check, X, Sparkles, Image, Type } from "lucide-react";

export function VideoDecayDashboard() {
  const { data: alerts = [], isLoading } = useContentDecayAlerts();
  const dismiss = useDismissDecayAlert();
  const { resolveTitle } = useVideoTitleMap();

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" /> Video Performance Decay
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Videos with declining performance that need re-optimization</p>
        </div>
        <Badge variant="secondary" className="text-xs">{alerts.length} active</Badge>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All videos performing within normal range</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className="border-border bg-card border-l-2 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">
                        {alert.video_title || resolveTitle(alert.youtube_video_id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                        {alert.decline_percent != null ? `↓ ${Math.abs(alert.decline_percent).toFixed(0)}%` : alert.decay_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {alert.decay_type.replace(/_/g, " ")}
                      </Badge>
                      {alert.previous_value != null && alert.current_value != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {alert.previous_value.toLocaleString()} → {alert.current_value.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Suggested actions */}
                    {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Suggested Actions</p>
                        {alert.suggested_actions.map((action, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                            <Sparkles className="w-3 h-3 text-primary shrink-0" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs text-success hover:text-success"
                      onClick={() => dismiss.mutate({ id: alert.id, status: "actioned" })}
                    >
                      <Check className="w-3 h-3" /> Action
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => dismiss.mutate({ id: alert.id, status: "dismissed" })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
