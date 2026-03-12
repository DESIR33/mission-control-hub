import { formatDistanceToNow } from "date-fns";
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

function GrowthAlertsSection() {
  const { alerts } = useGrowthAlerts();
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Growth Alerts
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
          const Icon = style.icon;
          return (
            <div
              key={alert.id}
              className={cn("flex items-start gap-3 rounded-md border px-3 py-2", style.border, style.bg)}
            >
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", style.text)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type] ?? { icon: Bell, color: "text-muted-foreground", bg: "bg-muted", label: notification.type };
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 border-b border-border/50 transition-colors hover:bg-sidebar-accent/30 group",
        isUnread && "bg-sidebar-accent/10"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          config.bg
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium",
                isUnread ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {notification.title}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs h-4 px-1.5 border-0",
                config.bg,
                config.color
              )}
            >
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUnread && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title="Mark as read"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        {notification.body && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {notification.body}
          </p>
        )}
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    createNotification,
    isCreating,
  } = useNotifications();

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Bell className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time updates from your workspace
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Demo: trigger AI proposal notification */}
          <Button
            variant="outline"
            size="sm"
            disabled={isCreating}
            onClick={() =>
              createNotification({
                type: "ai_proposal_ready",
                title: "AI proposal ready",
                body: "New sponsorship proposal is ready for your review",
                entity_type: "proposal",
              })
            }
          >
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test AI Proposal
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Growth Alerts */}
      <GrowthAlertsSection />

      {/* Notification list */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Notifications appear here when contacts are added, deals change
              stage, or tasks become overdue.
            </p>
          </div>
        ) : (
          <div>
            {/* Unread section */}
            {unreadCount > 0 && (
              <>
                <div className="px-5 py-2 bg-sidebar-accent/20 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Unread · {unreadCount}
                  </span>
                </div>
                {notifications
                  .filter((n) => !n.read_at)
                  .map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                    />
                  ))}
              </>
            )}

            {/* Read section */}
            {notifications.some((n) => n.read_at) && (
              <>
                <div className="px-5 py-2 bg-sidebar-accent/10 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Earlier
                  </span>
                </div>
                {notifications
                  .filter((n) => n.read_at)
                  .map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        {(Object.entries(TYPE_CONFIG) as [NotificationType, typeof TYPE_CONFIG[NotificationType]][]).map(
          ([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div
                key={type}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Icon className={cn("w-3 h-3", cfg.color)} />
                {cfg.label}
              </div>
            );
          }
        )}
        <span className="text-xs text-muted-foreground/50 ml-auto">
          Live via Supabase Realtime
        </span>
      </div>
    </div>
  );
}
