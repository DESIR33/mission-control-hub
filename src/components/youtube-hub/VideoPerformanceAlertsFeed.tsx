import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell, TrendingUp, TrendingDown, Trophy, Eye } from "lucide-react";
import { useVideoPerformanceAlerts, useMarkAlertRead } from "@/hooks/use-video-performance-alerts";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

const alertConfig: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  trending: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
  underperforming: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  milestone: { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
};

export function VideoPerformanceAlertsFeed() {
  const { data: alerts = [], isLoading } = useVideoPerformanceAlerts();
  const markRead = useMarkAlertRead();

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Performance Alerts
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[350px] px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-6">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-6">
              <Eye className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No performance alerts yet. Alerts will appear when videos hit important thresholds.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {alerts.map((alert) => {
                const config = alertConfig[alert.alert_type] ?? alertConfig.trending;
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors ${
                      !alert.is_read ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => !alert.is_read && markRead.mutate(alert.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!alert.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {alert.metric_value != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {alert.metric_name}: {typeof alert.metric_value === "number" ? alert.metric_value.toLocaleString() : alert.metric_value}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {safeFormatDistanceToNow(alert.created_at, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
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
