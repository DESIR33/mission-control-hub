import {
  Bell,
  TrendingUp,
  AlertTriangle,
  PartyPopper,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAlertHistory,
  type AlertHistoryEntry,
} from "@/hooks/use-alert-preferences";

const severityConfig: Record<
  AlertHistoryEntry["severity"],
  { icon: typeof Bell; color: string; border: string; badge: string }
> = {
  celebration: {
    icon: PartyPopper,
    color: "text-green-600 dark:text-green-400",
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AlertHistoryWidget() {
  const { data: alerts = [], isLoading } = useAlertHistory();

  const recentAlerts = alerts.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Recent Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : recentAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No alerts yet. Alerts will appear here as your channel grows.
          </p>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map((alert) => {
              const config = severityConfig[alert.severity] ?? severityConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-md border-l-4 px-3 py-2.5 bg-muted/30 ${config.border}`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(alert.created_at)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${config.badge}`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
