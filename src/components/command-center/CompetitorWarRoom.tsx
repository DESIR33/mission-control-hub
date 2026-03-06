import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import {
  Crosshair,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Crown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const priorityLabel: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
  5: "Critical",
};

const priorityColor: Record<number, string> = {
  1: "bg-slate-500/20 text-slate-400",
  2: "bg-blue-500/20 text-blue-400",
  3: "bg-yellow-500/20 text-yellow-400",
  4: "bg-orange-500/20 text-orange-400",
  5: "bg-red-500/20 text-red-400",
};

const difficultyColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "In Progress", className: "bg-yellow-500/20 text-yellow-400" },
  covered: { label: "Covered", className: "bg-green-500/20 text-green-400" },
};

export function CompetitorWarRoom() {
  const { workspaceId } = useWorkspace();
  const { data: channelStats } = useChannelStats();

  const { data: competitors = [], isLoading: competitorsLoading } = useQuery({
    queryKey: ["competitors-warroom", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_channels" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("subscriber_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: contentGaps = [], isLoading: gapsLoading } = useQuery({
    queryKey: ["content-gaps-warroom", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_gaps" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const isLoading = competitorsLoading || gapsLoading;

  const yourStats = useMemo(
    () => ({
      subscriber_count: channelStats?.subscriber_count ?? 0,
      video_count: channelStats?.video_count ?? 0,
      total_view_count: channelStats?.total_view_count ?? 0,
    }),
    [channelStats],
  );

  const top3 = useMemo(() => competitors.slice(0, 3), [competitors]);

  const sortedGaps = useMemo(() => {
    return [...contentGaps].sort((a, b) => {
      const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (pDiff !== 0) return pDiff;
      return (b.estimated_search_volume ?? 0) - (a.estimated_search_volume ?? 0);
    });
  }, [contentGaps]);

  const activitySummary = useMemo(() => {
    if (competitors.length === 0) return null;
    const totalSubs = competitors.reduce(
      (sum: number, c: any) => sum + (c.subscriber_count ?? 0),
      0,
    );
    const avgSubs = totalSubs / competitors.length;

    // Determine your rank among all (your channel + competitors) by subscriber count
    const allSubs = [yourStats.subscriber_count, ...competitors.map((c: any) => c.subscriber_count ?? 0)]
      .sort((a, b) => b - a);
    const yourRank = allSubs.indexOf(yourStats.subscriber_count) + 1;

    return {
      totalTracked: competitors.length,
      avgSubscribers: avgSubs,
      yourRank,
      totalParticipants: allSubs.length,
    };
  }, [competitors, yourStats]);

  const getComparisonBadge = (yours: number, theirs: number) => {
    if (yours > theirs) {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
          <TrendingUp className="w-3 h-3 mr-1" />
          Leading
        </Badge>
      );
    }
    if (yours < theirs) {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
          <TrendingDown className="w-3 h-3 mr-1" />
          Trailing
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">
        <Minus className="w-3 h-3 mr-1" />
        Tied
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            No competitors tracked yet. Add competitor channels to power the War Room.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Summary */}
      {activitySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Crosshair className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold font-mono text-foreground">
                {activitySummary.totalTracked}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Competitors Tracked
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-4 h-4 mx-auto mb-1 text-purple-400" />
              <p className="text-2xl font-bold font-mono text-foreground">
                {fmtCount(activitySummary.avgSubscribers)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Avg Competitor Subs
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
              <p className="text-2xl font-bold font-mono text-foreground">
                #{activitySummary.yourRank}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Your Rank of {activitySummary.totalParticipants}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-2xl font-bold font-mono text-foreground">
                {contentGaps.length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Content Gaps Found
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competitive Position Scorecard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Competitive Position Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Channel
                  </th>
                  <th className="text-right py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Subscribers
                  </th>
                  <th className="text-right py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Videos
                  </th>
                  <th className="text-right py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Total Views
                  </th>
                  <th className="text-center py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Your channel row */}
                <tr className="border-b border-border bg-primary/5">
                  <td className="py-2.5 font-medium text-foreground flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    Your Channel
                  </td>
                  <td className="py-2.5 text-right font-mono text-foreground">
                    {fmtCount(yourStats.subscriber_count)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-foreground">
                    {fmtCount(yourStats.video_count)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-foreground">
                    {fmtCount(yourStats.total_view_count)}
                  </td>
                  <td className="py-2.5 text-center">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      You
                    </Badge>
                  </td>
                </tr>
                {/* Top 3 competitors */}
                {top3.map((comp: any) => (
                  <tr key={comp.id} className="border-b border-border">
                    <td className="py-2.5 text-foreground">{comp.channel_name}</td>
                    <td className="py-2.5 text-right font-mono text-foreground">
                      {fmtCount(comp.subscriber_count ?? 0)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-foreground">
                      {fmtCount(comp.video_count ?? 0)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-foreground">
                      {fmtCount(comp.total_view_count ?? 0)}
                    </td>
                    <td className="py-2.5 text-center">
                      {getComparisonBadge(
                        yourStats.subscriber_count,
                        comp.subscriber_count ?? 0,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content Gap Opportunities */}
      {sortedGaps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Content Gap Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Topic
                    </th>
                    <th className="text-right py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Search Volume
                    </th>
                    <th className="text-center py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Difficulty
                    </th>
                    <th className="text-center py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Priority
                    </th>
                    <th className="text-center py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGaps.map((gap: any) => {
                    const status = statusConfig[gap.status] ?? statusConfig.open;
                    const priority = gap.priority ?? 1;
                    return (
                      <tr key={gap.id} className="border-b border-border">
                        <td className="py-2.5 text-foreground font-medium">
                          {gap.topic}
                        </td>
                        <td className="py-2.5 text-right font-mono text-foreground">
                          {gap.estimated_search_volume != null
                            ? fmtCount(gap.estimated_search_volume)
                            : "-"}
                        </td>
                        <td className="py-2.5 text-center">
                          {gap.difficulty ? (
                            <Badge
                              variant="outline"
                              className={`${difficultyColor[gap.difficulty] ?? "bg-gray-500/20 text-gray-400"} border-transparent text-[10px]`}
                            >
                              {gap.difficulty}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`${priorityColor[priority] ?? priorityColor[1]} border-transparent text-[10px]`}
                          >
                            {priorityLabel[priority] ?? `P${priority}`}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`${status.className} border-transparent text-[10px]`}
                          >
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitor Overview Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Competitor Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {competitors.map((comp: any) => {
            const subs = comp.subscriber_count ?? 0;
            const videos = comp.video_count ?? 0;
            const views = comp.total_view_count ?? 0;
            const avgViews = videos > 0 ? Math.round(views / videos) : 0;
            const subsAhead = yourStats.subscriber_count > subs;
            const subsEqual = yourStats.subscriber_count === subs;

            return (
              <Card key={comp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {comp.channel_name}
                      </p>
                      {comp.primary_niche && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {comp.primary_niche}
                        </p>
                      )}
                    </div>
                    {subsAhead ? (
                      <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
                    ) : subsEqual ? (
                      <Minus className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Subscribers
                      </p>
                      <p className="text-sm font-bold font-mono text-foreground">
                        {fmtCount(subs)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Videos
                      </p>
                      <p className="text-sm font-bold font-mono text-foreground">
                        {fmtCount(videos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Avg Views/Video
                      </p>
                      <p className="text-sm font-bold font-mono text-foreground">
                        {fmtCount(avgViews)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Your Position
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {subsAhead ? (
                          <span className="text-green-400">Ahead</span>
                        ) : subsEqual ? (
                          <span className="text-gray-400">Tied</span>
                        ) : (
                          <span className="text-red-400">Behind</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
