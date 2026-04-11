import {
  Bell, TrendingUp, TrendingDown, Zap, DollarSign,
  Eye, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useYouTubeAlerts, useMarkAlertRead, useMarkAllAlertsRead } from "@/hooks/use-youtube-alerts";
import { formatDistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { motion } from "framer-motion";

const alertIcon: Record<string, any> = {
  views_spike: TrendingUp,
  ctr_drop: TrendingDown,
  sub_surge: Zap,
  engagement_anomaly: Eye,
  revenue_milestone: DollarSign,
};

const alertColor: Record<string, string> = {
  celebration: "border-green-500/30 bg-green-500/5",
  warning: "border-yellow-500/30 bg-yellow-500/5",
  info: "border-blue-500/30 bg-blue-500/5",
};

const severityBadge: Record<string, string> = {
  celebration: "bg-green-500/15 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export function AlertsPanel() {
  const { data: alerts = [], isLoading } = useYouTubeAlerts(10);
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  if (isLoading) return null;

  const unread = alerts.filter((a) => !a.is_read);
  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Performance Alerts</h3>
            {unread.length > 0 && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                {unread.length} new
              </Badge>
            )}
          </div>
          {unread.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 px-2"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => {
            const Icon = alertIcon[alert.alert_type] || AlertTriangle;
            return (
              <div
                key={alert.id}
                className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                  !alert.is_read ? alertColor[alert.severity] : ""
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                  alert.severity === "celebration" ? "text-green-400" :
                  alert.severity === "warning" ? "text-yellow-400" : "text-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium ${alert.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                      {alert.title}
                    </p>
                    <Badge variant="outline" className={`text-[8px] ${severityBadge[alert.severity]}`}>
                      {alert.severity}
                    </Badge>
                  </div>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {safeFormatDistanceToNow(alert.created_at, { addSuffix: true })}
                  </p>
                </div>
                {!alert.is_read && (
                  <button
                    className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                    onClick={() => markRead.mutate(alert.id)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
