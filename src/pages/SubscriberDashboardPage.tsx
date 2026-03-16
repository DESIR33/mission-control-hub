import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriberAnalytics } from "@/hooks/use-subscriber-analytics";
import { useSubscriberVideoNotifications } from "@/hooks/use-subscriber-notifications";
import { useSubscriberGuides } from "@/hooks/use-subscriber-guides";
import { SubscriberEngagementBadge } from "@/components/subscribers/SubscriberEngagementBadge";
import { Users, UserPlus, UserMinus, Mail, BookOpen, Video, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function StatCard({ icon: Icon, label, value, className }: { icon: typeof Users; label: string; value: string | number; className?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", className)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold font-mono text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubscriberDashboardPage() {
  const { data: analytics, isLoading } = useSubscriberAnalytics();
  const { data: notifications = [] } = useSubscriberVideoNotifications();
  const { data: guides = [] } = useSubscriberGuides();

  if (isLoading || !analytics) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Subscriber Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your video subscriber audience</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Subscribers" value={analytics.totalSubscribers} className="bg-primary/10 text-primary" />
        <StatCard icon={UserPlus} label="Active" value={analytics.activeCount} className="bg-success/10 text-success" />
        <StatCard icon={UserMinus} label="Unsubscribed" value={analytics.unsubscribedCount} className="bg-destructive/10 text-destructive" />
        <StatCard icon={Mail} label="Bounced" value={analytics.bouncedCount} className="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Engagement Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["hot", "warm", "cool", "cold"] as const).map((tier) => {
                const count = analytics.engagementDistribution[tier];
                const total = analytics.totalSubscribers || 1;
                const pct = Math.round((count / total) * 100);
                const colors = {
                  hot: "bg-destructive",
                  warm: "bg-warning",
                  cool: "bg-primary",
                  cold: "bg-muted-foreground",
                };
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize w-12">{tier}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", colors[tier])} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Source Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.sourceBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(analytics.sourceBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-foreground">{source}</span>
                      <Badge variant="outline" className="text-xs font-mono">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guide Performance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Guide Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guides.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No guides created yet</p>
            ) : (
              <div className="space-y-2">
                {guides.map((guide) => (
                  <div key={guide.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{guide.name}</p>
                      <p className="text-xs text-muted-foreground">{guide.slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-foreground">{guide.download_count}</p>
                      <p className="text-xs text-muted-foreground">downloads</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Notifications */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="w-4 h-4 text-muted-foreground" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.video_title ?? n.video_id}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{n.sent_count}/{n.total_recipients} sent</span>
                        {n.total_recipients > 0 && (
                          <span>{Math.round((n.opened_count / n.total_recipients) * 100)}% opened</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0",
                      n.status === "sent" ? "bg-success/15 text-success border-success/30" :
                      n.status === "sending" ? "bg-warning/15 text-warning border-warning/30" :
                      n.status === "failed" ? "bg-destructive/15 text-destructive border-destructive/30" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {n.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Subscribers */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              Recent Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentSubscribers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subscribers yet</p>
            ) : (
              <div className="space-y-2">
                {analytics.recentSubscribers.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {(sub.first_name ?? sub.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sub.first_name ? `${sub.first_name} ${sub.last_name ?? ""}`.trim() : sub.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SubscriberEngagementBadge score={sub.engagement_score} />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth */}
        {analytics.growthByMonth.length > 0 && (
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Monthly Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {analytics.growthByMonth.map((item) => {
                  const max = Math.max(...analytics.growthByMonth.map((g) => g.count));
                  const heightPct = max > 0 ? (item.count / max) * 100 : 0;
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-mono text-muted-foreground">{item.count}</span>
                      <div
                        className="w-full bg-primary/80 rounded-t-sm min-h-[4px]"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{item.month.substring(5)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
