import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, TrendingUp, TrendingDown, Zap, DollarSign,
  Eye, X, CheckCircle2, AlertTriangle, Info, Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useYouTubeAlerts, useMarkAlertRead, useMarkAllAlertsRead } from "@/hooks/use-youtube-alerts";
import {
  useYouTubeAlertFeed,
  useMarkAlertFeedRead,
  useMarkAllAlertFeedRead,
  type AlertFeedItem,
} from "@/hooks/use-youtube-alert-feed";
import { useGrowthAlerts, type GrowthAlert } from "@/hooks/use-growth-alerts";
import { formatDistanceToNow } from "date-fns";

// ── Shared config ──────────────────────────────────────────────

const alertIcon: Record<string, any> = {
  views_spike: TrendingUp,
  ctr_drop: TrendingDown,
  sub_surge: Zap,
  engagement_anomaly: Eye,
  revenue_milestone: DollarSign,
};

const severityStyle: Record<string, { bg: string; text: string; icon: string }> = {
  celebration: { bg: "bg-green-500/5", text: "text-green-400", icon: "text-green-400" },
  warning: { bg: "bg-yellow-500/5", text: "text-yellow-400", icon: "text-yellow-400" },
  info: { bg: "bg-blue-500/5", text: "text-blue-400", icon: "text-blue-400" },
};

const growthSeverityStyles: Record<string, string> = {
  celebration: "border-green-500/30 bg-green-500/5 text-green-400",
  warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  info: "border-blue-500/30 bg-blue-500/5 text-blue-400",
};

const growthIcon: Record<string, any> = {
  celebration: Trophy,
  warning: AlertTriangle,
  info: Info,
};

// ── Unified Alert Hub ──────────────────────────────────────────

export function UnifiedAlertHub() {
  const { data: ytAlerts = [], isLoading: loadingYt } = useYouTubeAlerts(10);
  const { data: feedAlerts = [], isLoading: loadingFeed } = useYouTubeAlertFeed(10);
  const { data: growthAlerts = [] } = useGrowthAlerts();
  const markYtRead = useMarkAlertRead();
  const markAllYtRead = useMarkAllAlertsRead();
  const markFeedRead = useMarkAlertFeedRead();
  const markAllFeedRead = useMarkAllAlertFeedRead();
  const [dismissedGrowth, setDismissedGrowth] = useState<Set<string>>(new Set());

  const isLoading = loadingYt || loadingFeed;

  // Combine all alerts into a unified list
  type UnifiedAlert = {
    id: string;
    source: "youtube" | "feed" | "growth";
    icon: any;
    title: string;
    description?: string;
    severity: string;
    timestamp: Date;
    isRead: boolean;
  };

  const unified: UnifiedAlert[] = [];

  // YouTube alerts
  ytAlerts.forEach((a) => {
    unified.push({
      id: `yt-${a.id}`,
      source: "youtube",
      icon: alertIcon[a.alert_type] || AlertTriangle,
      title: a.title,
      description: a.description,
      severity: a.severity,
      timestamp: new Date(a.created_at),
      isRead: a.is_read,
    });
  });

  // Feed alerts
  feedAlerts.forEach((a) => {
    unified.push({
      id: `feed-${a.id}`,
      source: "feed",
      icon: alertIcon[a.alert_type] || AlertTriangle,
      title: a.title,
      description: a.description,
      severity: a.severity,
      timestamp: new Date(a.created_at),
      isRead: false,
    });
  });

  // Growth alerts
  growthAlerts
    .filter((a) => !dismissedGrowth.has(a.id))
    .forEach((a) => {
      unified.push({
        id: `growth-${a.id}`,
        source: "growth",
        icon: growthIcon[a.severity] || Info,
        title: a.message,
        severity: a.severity,
        timestamp: new Date(),
        isRead: false,
      });
    });

  // Sort by time, newest first
  unified.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const unreadCount = unified.filter((a) => !a.isRead).length;

  if (isLoading || unified.length === 0) return null;

  const handleDismiss = (alert: UnifiedAlert) => {
    const rawId = alert.id.replace(/^(yt|feed|growth)-/, "");
    if (alert.source === "youtube") markYtRead.mutate(rawId);
    else if (alert.source === "feed") markFeedRead.mutate(rawId);
    else setDismissedGrowth((prev) => new Set([...prev, rawId]));
  };

  const handleDismissAll = () => {
    markAllYtRead.mutate();
    markAllFeedRead.mutate();
    setDismissedGrowth(new Set(growthAlerts.map((a) => a.id)));
  };

  const shown = unified.slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10">
            <Bell className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-card-foreground">Alerts & Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 1 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDismissAll}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Dismiss all
          </Button>
        )}
      </div>

      {/* Alerts list */}
      <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
        <AnimatePresence>
          {shown.map((alert) => {
            const style = severityStyle[alert.severity] ?? severityStyle.info;
            const Icon = alert.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`px-4 py-3 flex items-start gap-3 ${!alert.isRead ? style.bg : ""}`}
              >
                <div className={`mt-0.5 shrink-0 ${style.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${alert.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                    {alert.title}
                  </p>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </p>
                </div>
                <button
                  className="p-1 rounded hover:bg-muted transition-colors shrink-0 mt-0.5"
                  onClick={() => handleDismiss(alert)}
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
