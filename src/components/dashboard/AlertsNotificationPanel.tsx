import {
  Bell, TrendingUp, TrendingDown, Zap, DollarSign,
  Eye, X, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useYouTubeAlertFeed,
  useMarkAlertFeedRead,
  useMarkAllAlertFeedRead,
  type AlertFeedItem,
} from "@/hooks/use-youtube-alert-feed";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { formatDistanceToNow } from "date-fns";

const alertTypeConfig: Record<
  AlertFeedItem["alert_type"],
  { icon: any; category: "celebration" | "warning" | "info" }
> = {
  views_spike: { icon: TrendingUp, category: "celebration" },
  ctr_drop: { icon: TrendingDown, category: "warning" },
  sub_surge: { icon: Zap, category: "celebration" },
  engagement_anomaly: { icon: Eye, category: "info" },
  revenue_milestone: { icon: DollarSign, category: "celebration" },
};

const severityStyles: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  celebration: {
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    text: "text-green-400",
    icon: "text-green-400",
  },
  warning: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    text: "text-yellow-400",
    icon: "text-yellow-400",
  },
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    text: "text-blue-400",
    icon: "text-blue-400",
  },
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "celebration":
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "warning":
      return <AlertTriangle className="w-3.5 h-3.5" />;
    default:
      return <Info className="w-3.5 h-3.5" />;
  }
}

export function AlertsNotificationPanel() {
  const { data: alerts = [], isLoading } = useYouTubeAlertFeed(10);
  const markRead = useMarkAlertFeedRead();
  const markAllRead = useMarkAllAlertFeedRead();

  if (isLoading || alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10">
            <Bell className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-card-foreground">Notifications</h3>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
            {alerts.length} unread
          </Badge>
        </div>
        {alerts.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Dismiss all
          </Button>
        )}
      </div>

      {/* Alerts list */}
      <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
        {alerts.map((alert) => {
          const config = alertTypeConfig[alert.alert_type];
          const style = severityStyles[alert.severity] ?? severityStyles.info;
          const TypeIcon = config?.icon ?? AlertTriangle;

          return (
            <div
              key={alert.id}
              className={`px-4 py-3 flex items-start gap-3 animate-fade-in ${style.bg}`}
            >
              {/* Category icon */}
              <div className={`mt-0.5 shrink-0 ${style.icon}`}>
                <TypeIcon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-medium text-foreground truncate">
                    {alert.title}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] ${style.text}`}>
                    <SeverityIcon severity={alert.severity} />
                  </span>
                </div>
                {alert.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {safeFormatDistanceToNow(alert.created_at, { addSuffix: true })}
                </p>
              </div>

              {/* Dismiss button */}
              <button
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                onClick={() => markRead.mutate(alert.id)}
                disabled={markRead.isPending}
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
