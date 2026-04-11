import { DistanceToNow } from "date-fns";
import {
  Bell,
  UserPlus,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCheck,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";
import { useGrowthAlerts } from "@/hooks/use-growth-alerts";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  new_contact: {
    icon: UserPlus,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "New Contact",
  },
  deal_stage_change: {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Deal Update",
  },
  overdue_task: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    label: "Overdue Task",
  },
  ai_proposal_ready: {
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    label: "AI Proposal",
  },
};

const SEVERITY_STYLE: Record<string, { icon: React.ElementType; border: string; bg: string; text: string }> = {
  celebration: { icon: TrendingUp, border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-500" },
  warning: { icon: Clock, border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-500" },
  info: { icon: Bell, border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-500" },
};

function PanelNotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.ai_proposal_ready;
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-sidebar-accent/30 group",
        isUnread && "bg-sidebar-accent/10"
      )}
    >
      <div
        className={cn(
          "mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          config.bg
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium leading-tight",
              isUnread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {notification.title}
          </span>
          {isUnread && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
              title="Mark as read"
            >
              <Check className="w-3 h-3" />
            </button>
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {notification.body}
          </p>
        )}
        <span className="text-xs text-muted-foreground/60 mt-1 block">
          {safeFormatDistanceToNow(notification.created_at, {
            addSuffix: true,
          })}
        </span>
      </div>

      {isUnread && (
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
    </div>
  );
}

export function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  } = useNotifications();
  const { alerts } = useGrowthAlerts();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 px-1.5">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            className="text-muted-foreground hover:text-foreground h-7 text-xs"
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Growth Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 py-3 border-b border-border space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Growth Alerts
          </span>
          {alerts.slice(0, 3).map((alert) => {
            const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
            const Icon = style.icon;
            return (
              <div
                key={alert.id}
                className={cn("flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs", style.border, style.bg)}
              >
                <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", style.text)} />
                <span className="text-foreground">{alert.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Bell className="w-6 h-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <>
            {notifications.slice(0, 20).map((n) => (
              <PanelNotificationItem
                key={n.id}
                notification={n}
                onMarkRead={markRead}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
