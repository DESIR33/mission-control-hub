import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  CheckCircle,
  Circle,
  Flame,
  Eye,
  MousePointerClick,
  Video,
  Users,
} from "lucide-react";
import { differenceInDays, format, subDays } from "date-fns";

interface ChannelStats {
  subscriber_count: number;
  total_view_count: number;
  video_count: number;
  fetched_at: string;
}

interface AnalyticsRow {
  date: string;
  subscribers_gained: number;
  subscribers_lost: number;
  net_subscribers: number;
  views: number;
  impressions: number;
  impressions_ctr: number;
}

interface GrowthGoal {
  id: string;
  target_value: number;
  current_value: number;
  start_date: string | null;
  target_date: string | null;
  status: string;
}

interface GrowthLever {
  id: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

type PaceStatus = "on-track" | "slightly-behind" | "behind";

interface CommandData {
  currentSubs: number;
  targetSubs: number;
  progressPercent: number;
  subsNeeded: number;
  daysRemaining: number;
  requiredDailyRate: number;
  actualDailyAvg7d: number;
  paceStatus: PaceStatus;
  levers: GrowthLever[];
}

const DEFAULT_TARGET = 50_000;
const DEFAULT_TARGET_DATE_MONTHS = 10;

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtRate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(1);
}

function getPaceStatus(actual: number, required: number): PaceStatus {
  if (required <= 0) return "on-track";
  const ratio = actual / required;
  if (ratio >= 0.9) return "on-track";
  if (ratio >= 0.65) return "slightly-behind";
  return "behind";
}

const paceConfig: Record<
  PaceStatus,
  { label: string; badgeClass: string; borderClass: string; glowClass: string; icon: React.ReactNode }
> = {
  "on-track": {
    label: "On Track",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderClass: "border-emerald-500/40",
    glowClass: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  "slightly-behind": {
    label: "Slightly Behind",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderClass: "border-amber-500/40",
    glowClass: "shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]",
    icon: <Minus className="w-3.5 h-3.5" />,
  },
  behind: {
    label: "Behind",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    borderClass: "border-red-500/40",
    glowClass: "shadow-[0_0_30px_-5px_rgba(239,68,68,0.15)]",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
  },
};

function generateLevers(
  analytics: AnalyticsRow[],
  stats: ChannelStats | null,
  paceStatus: PaceStatus,
  requiredDaily: number,
  actualDaily: number,
): GrowthLever[] {
  const levers: GrowthLever[] = [];

  if (analytics.length === 0) {
    return [
      { id: "connect", icon: <Video className="w-4 h-4 text-blue-400" />, label: "Connect YouTube channel", detail: "Link your channel to enable data-driven recommendations", priority: "high" },
      { id: "set-goal", icon: <Target className="w-4 h-4 text-purple-400" />, label: "Set your growth goal", detail: "Define a subscriber milestone to track progress", priority: "high" },
      { id: "upload", icon: <Flame className="w-4 h-4 text-orange-400" />, label: "Publish consistently", detail: "Aim for 2-3 videos per week to build momentum", priority: "medium" },
    ];
  }

  const recent7 = analytics.slice(0, 7);
  const prior7 = analytics.slice(7, 14);

  const avgRecentCTR = recent7.length > 0 ? recent7.reduce((s, r) => s + r.impressions_ctr, 0) / recent7.length : 0;
  const avgPriorCTR = prior7.length > 0 ? prior7.reduce((s, r) => s + r.impressions_ctr, 0) / prior7.length : 0;
  const avgRecentViews = recent7.length > 0 ? recent7.reduce((s, r) => s + r.views, 0) / recent7.length : 0;
  const avgPriorViews = prior7.length > 0 ? prior7.reduce((s, r) => s + r.views, 0) / prior7.length : 0;
  const totalRecentImpressions = recent7.reduce((s, r) => s + r.impressions, 0);
  const totalPriorImpressions = prior7.reduce((s, r) => s + r.impressions, 0);
  const recentSubsGained = recent7.reduce((s, r) => s + r.subscribers_gained, 0);
  const recentSubsLost = recent7.reduce((s, r) => s + r.subscribers_lost, 0);

  if (prior7.length > 0 && avgRecentCTR < avgPriorCTR * 0.85 && avgRecentCTR > 0) {
    levers.push({ id: "ctr-drop", icon: <MousePointerClick className="w-4 h-4 text-amber-400" />, label: "Improve thumbnails & titles", detail: `CTR dropped ${((1 - avgRecentCTR / avgPriorCTR) * 100).toFixed(0)}% week-over-week. A/B test new thumbnail styles.`, priority: "high" });
  }

  if (prior7.length > 0 && totalRecentImpressions < totalPriorImpressions * 0.8) {
    levers.push({ id: "impressions-drop", icon: <Eye className="w-4 h-4 text-blue-400" />, label: "Boost discoverability", detail: `Impressions fell ${((1 - totalRecentImpressions / totalPriorImpressions) * 100).toFixed(0)}%. Optimize tags, descriptions, and post timing.`, priority: "high" });
  }

  if (recentSubsGained > 0 && recentSubsLost / recentSubsGained > 0.3) {
    levers.push({ id: "churn-spike", icon: <Users className="w-4 h-4 text-red-400" />, label: "Reduce subscriber churn", detail: `Lost ${recentSubsLost} subs this week (${((recentSubsLost / recentSubsGained) * 100).toFixed(0)}% of gained). Review recent content alignment.`, priority: "high" });
  }

  if (paceStatus === "behind" || paceStatus === "slightly-behind") {
    const gap = requiredDaily - actualDaily;
    levers.push({ id: "increase-output", icon: <Flame className="w-4 h-4 text-orange-400" />, label: "Increase publishing cadence", detail: `Need +${fmtRate(gap)} subs/day more. An extra video this week could close the gap.`, priority: paceStatus === "behind" ? "high" : "medium" });
  }

  if (avgRecentViews > 0 && recentSubsGained > 0) {
    const conversionRate = recentSubsGained / (avgRecentViews * 7);
    if (conversionRate < 0.02) {
      levers.push({ id: "conversion", icon: <Video className="w-4 h-4 text-purple-400" />, label: "Add stronger CTAs in videos", detail: `Only ${(conversionRate * 100).toFixed(1)}% of viewers subscribe. Add mid-roll CTA cards and end screens.`, priority: "medium" });
    }
  }

  if (prior7.length > 0 && avgRecentViews > avgPriorViews * 1.15) {
    levers.push({ id: "views-momentum", icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: "Capitalize on view momentum", detail: `Views up ${((avgRecentViews / avgPriorViews - 1) * 100).toFixed(0)}% WoW. Publish a follow-up to your trending content.`, priority: "medium" });
  }

  if (levers.length < 3) {
    levers.push({ id: "consistency", icon: <Zap className="w-4 h-4 text-yellow-400" />, label: "Maintain upload consistency", detail: "Keep a steady 2-3x/week schedule. The algorithm rewards predictable creators.", priority: "low" });
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  levers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return levers.slice(0, 5);
}

function useGrowthCommandData() {
  const { workspaceId } = useWorkspace();

  const { data: latestStats, isLoading: statsLoading } = useQuery({
    queryKey: ["growth-command-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("subscriber_count, total_view_count, video_count, fetched_at")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ChannelStats[];
      return rows[0] ?? null;
    },
    enabled: !!workspaceId,
  });

  const { data: growthGoal, isLoading: goalLoading } = useQuery({
    queryKey: ["growth-command-goal", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("id, target_value, current_value, start_date, target_date, status")
        .eq("workspace_id", workspaceId!)
        .eq("metric", "subscribers")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const rows = (data ?? []) as unknown as GrowthGoal[];
      return rows[0] ?? null;
    },
    enabled: !!workspaceId,
  });

  const { data: analytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ["growth-command-analytics", workspaceId],
    queryFn: async () => {
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, subscribers_gained, subscribers_lost, net_subscribers, views, impressions, impressions_ctr")
        .eq("workspace_id", workspaceId!)
        .gte("date", since)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AnalyticsRow[];
    },
    enabled: !!workspaceId,
  });

  const commandData = useMemo((): CommandData | null => {
    const currentSubs = latestStats?.subscriber_count ?? growthGoal?.current_value ?? null;
    if (currentSubs === null) return null;

    const targetSubs = growthGoal?.target_value ?? DEFAULT_TARGET;
    let targetDate: Date;
    if (growthGoal?.target_date) {
      targetDate = new Date(growthGoal.target_date);
    } else {
      targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + DEFAULT_TARGET_DATE_MONTHS);
    }

    const now = new Date();
    const daysRemaining = Math.max(1, differenceInDays(targetDate, now));
    const subsNeeded = Math.max(0, targetSubs - currentSubs);
    const requiredDailyRate = subsNeeded / daysRemaining;

    const recent7 = analytics.slice(0, 7);
    let actualDailyAvg7d = 0;
    if (recent7.length > 0) {
      const totalNet = recent7.reduce((sum, r) => sum + r.net_subscribers, 0);
      actualDailyAvg7d = totalNet / recent7.length;
    }

    const paceStatus = getPaceStatus(actualDailyAvg7d, requiredDailyRate);
    const progressPercent = targetSubs > 0 ? Math.max(0, Math.min(100, (currentSubs / targetSubs) * 100)) : 0;
    const levers = generateLevers(analytics, latestStats, paceStatus, requiredDailyRate, actualDailyAvg7d);

    return { currentSubs, targetSubs, progressPercent, subsNeeded, daysRemaining, requiredDailyRate, actualDailyAvg7d, paceStatus, levers };
  }, [latestStats, growthGoal, analytics]);

  return { data: commandData, isLoading: statsLoading || goalLoading || analyticsLoading, hasGoal: !!growthGoal, hasStats: !!latestStats };
}

function GrowthCommandSkeleton() {
  return (
    <Card className="relative overflow-hidden border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function SetupPrompt() {
  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-muted-foreground/20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
      <CardContent className="relative flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Set Up Your Growth Command</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Connect your YouTube channel and set a subscriber goal to unlock personalized growth
          insights, pace tracking, and AI-powered action items.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>Takes less than 2 minutes to set up</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LeverItem({ lever }: { lever: GrowthLever }) {
  const [checked, setChecked] = useState(false);

  const priorityDot: Record<string, string> = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
  };

  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all active:scale-[0.99] ${
        checked ? "bg-muted/30 opacity-60" : "bg-muted/50 hover:bg-muted/70"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {checked ? (
          <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
        ) : (
          <Circle className="w-4.5 h-4.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {lever.icon}
          <span className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {lever.label}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[lever.priority]}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{lever.detail}</p>
      </div>
    </button>
  );
}

export function GrowthCommandWidget() {
  const { data, isLoading, hasGoal, hasStats } = useGrowthCommandData();

  if (isLoading) return <GrowthCommandSkeleton />;
  if (!data || (!hasGoal && !hasStats)) return <SetupPrompt />;

  const pace = paceConfig[data.paceStatus];

  return (
    <div className="animate-fade-in">
      <Card className={`relative overflow-hidden ${pace.borderClass} ${pace.glowClass} transition-shadow duration-500`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-purple-500/[0.06] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight">Growth Command Center</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Road to {fmtCount(data.targetSubs)} subscribers</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs font-semibold gap-1 ${pace.badgeClass}`}>
              {pace.icon}
              {pace.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-5">
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-3xl font-bold font-mono tracking-tight text-foreground">{fmtCount(data.currentSubs)}</p>
                <p className="text-xs text-muted-foreground">{fmtCount(data.subsNeeded)} to go</p>
              </div>
              <p className="text-sm font-mono font-semibold text-muted-foreground">{data.progressPercent.toFixed(1)}%</p>
            </div>

            <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${data.progressPercent}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                style={{ width: `${data.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">Days Left</p>
              <p className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">{data.daysRemaining}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">Need/Day</p>
              <p className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">+{fmtRate(data.requiredDailyRate)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">Avg 7d/Day</p>
              <p className={`text-base sm:text-lg font-bold font-mono mt-0.5 ${
                data.actualDailyAvg7d >= data.requiredDailyRate ? "text-emerald-400"
                  : data.actualDailyAvg7d >= data.requiredDailyRate * 0.65 ? "text-amber-400" : "text-red-400"
              }`}>+{fmtRate(data.actualDailyAvg7d)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Daily rate vs required</span>
              <span className="font-mono">
                {data.requiredDailyRate > 0 ? `${((data.actualDailyAvg7d / data.requiredDailyRate) * 100).toFixed(0)}%` : "--"}
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                  data.paceStatus === "on-track" ? "bg-emerald-500"
                    : data.paceStatus === "slightly-behind" ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, data.requiredDailyRate > 0 ? (data.actualDailyAvg7d / data.requiredDailyRate) * 100 : 0)}%` }}
              />
              <div className="absolute inset-y-0 right-0 w-px bg-foreground/30" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">This Week&apos;s Growth Levers</h4>
            </div>
            <div className="space-y-2">
              {data.levers.map((lever) => (
                <LeverItem key={lever.id} lever={lever} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
