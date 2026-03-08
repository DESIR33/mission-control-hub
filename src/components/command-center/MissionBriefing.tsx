import { useMemo } from "react";
import {
  Rocket, Video, DollarSign, Users, AlertTriangle,
  Clock, Target, TrendingUp, BarChart3, Zap,
  ChevronRight, Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  chartTooltipStyle,
  xAxisDefaults,
  yAxisDefaults,
  barDefaults,
  chartAnimationDefaults,
  fmtCount,
} from "@/lib/chart-theme";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useDeals } from "@/hooks/use-deals";
import { useContentCalendarEntries } from "@/hooks/use-content-calendar";
import { useGrowthForecast } from "@/hooks/use-growth-forecast";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import { differenceInDays, format, startOfWeek, subWeeks } from "date-fns";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};

const truncate = (text: string, maxLen = 40): string =>
  text.length > maxLen ? text.substring(0, maxLen) + "\u2026" : text;

const STATUS_COLORS: Record<string, string> = {
  idea: "border-slate-400/40 bg-slate-400/15 text-slate-400",
  scripting: "border-blue-400/40 bg-blue-400/15 text-blue-400",
  recording: "border-purple-400/40 bg-purple-400/15 text-purple-400",
  filming: "border-purple-400/40 bg-purple-400/15 text-purple-400",
  editing: "border-yellow-400/40 bg-yellow-400/15 text-yellow-400",
  scheduled: "border-green-400/40 bg-green-400/15 text-green-400",
  published: "border-emerald-400/40 bg-emerald-400/15 text-emerald-400",
};

const PRIORITY_ICON_COLOR: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
};

// ─── Types for derived data ─────────────────────────────────────────────────

interface PriorityItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  type: "video" | "deal" | "growth" | "cadence";
}

interface WeeklyVelocityPoint {
  week: string;
  count: number;
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function BriefingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Priorities skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-xs" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pipeline skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-2.5 sm:p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attention needed skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Chart skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function MissionBriefing() {
  const { data: channelStats, isLoading: statsLoading } = useChannelStats();
  const { data: videos = [], isLoading: videosLoading } = useVideoQueue();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: calendarEntries = [], isLoading: calendarLoading } = useContentCalendarEntries();
  const { data: forecast, isLoading: forecastLoading } = useGrowthForecast();
  const { data: revenue, isLoading: revenueLoading } = useUnifiedRevenue();

  const isLoading =
    statsLoading || videosLoading || dealsLoading || calendarLoading || forecastLoading || revenueLoading;

  // ── Derived: Today's Priorities ───────────────────────────────────────────
  const priorities = useMemo((): PriorityItem[] => {
    const items: PriorityItem[] = [];
    const now = new Date();

    // Videos with targetPublishDate within the next 3 days
    const urgentVideos = videos.filter((v) => {
      if (!v.targetPublishDate || v.status === "published") return false;
      const days = differenceInDays(new Date(v.targetPublishDate), now);
      return days >= 0 && days <= 3;
    });
    urgentVideos.slice(0, 2).forEach((v) => {
      items.push({
        id: `video-${v.id}`,
        icon: <Video className="w-4 h-4 text-blue-400" />,
        label: `Finalize "${truncate(v.title, 35)}"`,
        type: "video",
      });
    });

    // Stale deals (>7 days since updated_at, not closed)
    const staleDeals = deals.filter((d) => {
      if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
      return differenceInDays(now, new Date(d.updated_at)) > 7;
    });
    staleDeals.slice(0, 2).forEach((d) => {
      items.push({
        id: `deal-${d.id}`,
        icon: <DollarSign className="w-4 h-4 text-yellow-400" />,
        label: `Follow up on "${truncate(d.title, 35)}"`,
        type: "deal",
      });
    });

    // Weekly publish rate < 2
    const recentPublished = calendarEntries.filter((e) => {
      if (e.status !== "published") return false;
      return differenceInDays(now, new Date(e.scheduled_date)) <= 14;
    });
    const weeklyRate = recentPublished.length / 2;
    if (weeklyRate < 2) {
      items.push({
        id: "cadence",
        icon: <Zap className="w-4 h-4 text-orange-400" />,
        label: "Increase publishing cadence \u2014 below 2 videos/week",
        type: "cadence",
      });
    }

    // Growth forecast not on track
    if (forecast && !forecast.onTrack) {
      items.push({
        id: "growth",
        icon: <TrendingUp className="w-4 h-4 text-red-400" />,
        label: "Review growth strategy \u2014 behind forecast target",
        type: "growth",
      });
    }

    return items.slice(0, 3);
  }, [videos, deals, calendarEntries, forecast]);

  // ── Derived: Content Pipeline (next 3 upcoming) ───────────────────────────
  const pipeline = useMemo(() => {
    const now = new Date();
    return videos
      .filter((v) => v.status !== "published" && v.targetPublishDate)
      .sort((a, b) =>
        new Date(a.targetPublishDate!).getTime() - new Date(b.targetPublishDate!).getTime()
      )
      .slice(0, 3)
      .map((v) => ({
        ...v,
        daysUntil: differenceInDays(new Date(v.targetPublishDate!), now),
      }));
  }, [videos]);

  // ── Derived: Quick Stats ──────────────────────────────────────────────────
  const quickStats = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const monthlyRevenue = revenue?.monthly?.find((m) => m.month === currentMonth);

    const activeDeals = deals.filter(
      (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
    );

    return {
      subscribers: channelStats?.subscriber_count ?? 0,
      views: channelStats?.total_view_count ?? 0,
      revenueThisMonth: monthlyRevenue?.total ?? 0,
      activeDeals: activeDeals.length,
    };
  }, [channelStats, revenue, deals]);

  // ── Derived: Attention Needed ─────────────────────────────────────────────
  const attentionItems = useMemo(() => {
    const now = new Date();
    const items: { id: string; icon: React.ReactNode; label: string; severity: "warning" | "danger" }[] = [];

    // Stale deals (>7 days in same stage)
    deals
      .filter((d) => {
        if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
        return differenceInDays(now, new Date(d.updated_at)) > 7;
      })
      .slice(0, 3)
      .forEach((d) => {
        const staleDays = differenceInDays(now, new Date(d.updated_at));
        items.push({
          id: `stale-deal-${d.id}`,
          icon: <Clock className="w-3.5 h-3.5 text-orange-400" />,
          label: `"${truncate(d.title, 30)}" stuck in ${d.stage} for ${staleDays}d${d.company ? ` (${d.company.name})` : ""}`,
          severity: staleDays > 14 ? "danger" : "warning",
        });
      });

    // Upcoming deadlines from content calendar (within 3 days)
    calendarEntries
      .filter((e) => {
        if (e.status === "published") return false;
        const days = differenceInDays(new Date(e.scheduled_date), now);
        return days >= 0 && days <= 3;
      })
      .slice(0, 3)
      .forEach((e) => {
        const days = differenceInDays(new Date(e.scheduled_date), now);
        items.push({
          id: `deadline-${e.id}`,
          icon: <Calendar className="w-3.5 h-3.5 text-red-400" />,
          label: `"${truncate(e.title, 30)}" due ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`} (${e.status})`,
          severity: days <= 1 ? "danger" : "warning",
        });
      });

    return items;
  }, [deals, calendarEntries]);

  // ── Derived: Weekly Velocity (last 8 weeks) ───────────────────────────────
  const weeklyVelocity = useMemo((): WeeklyVelocityPoint[] => {
    const now = new Date();
    const weeks: WeeklyVelocityPoint[] = [];

    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const count = calendarEntries.filter((e) => {
        if (e.status !== "published") return false;
        const date = new Date(e.scheduled_date);
        return date >= weekStart && date <= weekEnd;
      }).length;

      weeks.push({
        week: format(weekStart, "MMM d"),
        count,
      });
    }

    return weeks;
  }, [calendarEntries]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-blue-500 shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Mission Briefing</h2>
        </div>
        <BriefingSkeleton />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Rocket className="w-5 h-5 text-blue-500 shrink-0" />
        <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">Mission Briefing</h2>
        <Badge variant="outline" className="ml-auto text-xs border-blue-400/40 text-blue-400 shrink-0 hidden sm:inline-flex">
          {format(new Date(), "EEEE, MMM d")}
        </Badge>
        <Badge variant="outline" className="ml-auto text-xs border-blue-400/40 text-blue-400 shrink-0 sm:hidden">
          {format(new Date(), "MMM d")}
        </Badge>
      </div>

      {/* 1. Today's Priorities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-purple-500" />
            Today&apos;s Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              All clear \u2014 no urgent actions right now.
            </p>
          ) : (
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border bg-muted/30 px-2.5 sm:px-3 py-2 sm:py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted text-[10px] sm:text-xs font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  {p.icon}
                  <p className="text-xs sm:text-sm text-foreground flex-1 min-w-0 truncate">{p.label}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Content Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-blue-500" />
            Content Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No upcoming videos in the queue.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {pipeline.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-border bg-muted/20 p-2.5 sm:p-3 space-y-1.5 sm:space-y-2"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {truncate(v.title, 36)}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-xs ${STATUS_COLORS[v.status] ?? ""}`}
                    >
                      {v.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-xs ${PRIORITY_ICON_COLOR[v.priority] ?? "text-slate-400"} border-current/30`}
                    >
                      {v.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 shrink-0" />
                    {v.daysUntil < 0
                      ? <span className="text-red-400">{Math.abs(v.daysUntil)}d overdue</span>
                      : v.daysUntil === 0
                        ? <span className="text-orange-400">Due today</span>
                        : v.daysUntil === 1
                          ? <span className="text-yellow-400">Due tomorrow</span>
                          : <span>{v.daysUntil}d left</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                Subscribers
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
              {fmtCount(quickStats.subscribers)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                Total Views
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
              {fmtCount(quickStats.views)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                Revenue
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
              {fmtCurrency(quickStats.revenueThisMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                Active Deals
              </p>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
              {quickStats.activeDeals}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Attention Needed */}
      {attentionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Attention Needed
              <Badge
                variant="outline"
                className="ml-1 text-xs border-orange-400/40 text-orange-400"
              >
                {attentionItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 ${
                    item.severity === "danger"
                      ? "border-red-400/30 bg-red-400/5"
                      : "border-orange-400/30 bg-orange-400/5"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <p className="text-[11px] sm:text-xs text-foreground flex-1 min-w-0 break-words">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Weekly Velocity Mini-Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="truncate">Weekly Velocity</span>
            <span className="text-xs text-muted-foreground font-normal ml-1 hidden sm:inline">
              Videos published / week (last 8 weeks)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="-mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height={150} className="sm:!h-[180px]">
            <BarChart data={weeklyVelocity} barSize={20}>
              <XAxis
                dataKey="week"
                {...xAxisDefaults}
                tick={{ ...xAxisDefaults.tick, fontSize: 10 }}
              />
              <YAxis
                allowDecimals={false}
                {...yAxisDefaults}
                width={20}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                formatter={(value: number) => [`${value} video${value !== 1 ? "s" : ""}`, "Published"]}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                {...barDefaults}
                {...chartAnimationDefaults}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
