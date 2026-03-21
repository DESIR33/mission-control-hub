import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";
import { differenceInHours, format } from "date-fns";
import {
  Rocket, Eye, MousePointerClick, TrendingUp, TrendingDown,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmtCount } from "@/lib/chart-theme";

export function LaunchMonitor() {
  const { workspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["launch-monitor", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { recentVideos: [], benchmarks: null };

      // Get videos published in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recent } = await (supabase as any)
        .from("youtube_video_stats")
        .select("video_id, title, views, likes, comments, ctr_percent, impressions, published_at")
        .eq("workspace_id", workspaceId)
        .gte("published_at", sevenDaysAgo.toISOString())
        .order("published_at", { ascending: false });

      // Get hourly stats for recently published videos
      const recentIds = (recent || []).map((v: any) => v.video_id);
      let hourlyData: any[] = [];
      if (recentIds.length > 0) {
        const { data: hourly } = await (supabase as any)
          .from("video_hourly_stats")
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("youtube_video_id", recentIds)
          .order("hour_number", { ascending: true });
        hourlyData = hourly || [];
      }

      // Get channel benchmarks (average first-48h performance from older videos)
      const { data: allVideos } = await (supabase as any)
        .from("youtube_video_stats")
        .select("views, ctr_percent, impressions, likes")
        .eq("workspace_id", workspaceId)
        .lt("published_at", sevenDaysAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(50);

      const benchmarks = allVideos && allVideos.length > 0 ? {
        avgViews: allVideos.reduce((s: number, v: any) => s + (v.views || 0), 0) / allVideos.length,
        avgCtr: allVideos.reduce((s: number, v: any) => s + (v.ctr_percent || 0), 0) / allVideos.length,
        avgImpressions: allVideos.reduce((s: number, v: any) => s + (v.impressions || 0), 0) / allVideos.length,
      } : null;

      const recentVideos = (recent || []).map((v: any) => {
        const hoursLive = differenceInHours(new Date(), new Date(v.published_at));
        const videoHourly = hourlyData.filter((h: any) => h.youtube_video_id === v.video_id);

        let status: "outperforming" | "on_track" | "underperforming" = "on_track";
        if (benchmarks) {
          const viewRatio = v.views / (benchmarks.avgViews || 1);
          if (viewRatio > 1.3) status = "outperforming";
          else if (viewRatio < 0.5) status = "underperforming";
        }

        return {
          ...v,
          hoursLive: Math.min(hoursLive, 48),
          status,
          hourlyData: videoHourly,
        };
      });

      return { recentVideos, benchmarks };
    },
    enabled: !!workspaceId,
    ...getGatedFreshness("launchMonitor", canRefresh),
  });

  const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    outperforming: { color: "text-green-500 bg-green-500/10 border-green-500/30", icon: ArrowUpRight, label: "Outperforming" },
    on_track: { color: "text-blue-500 bg-blue-500/10 border-blue-500/30", icon: TrendingUp, label: "On Track" },
    underperforming: { color: "text-red-500 bg-red-500/10 border-red-500/30", icon: ArrowDownRight, label: "Below Average" },
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Rocket className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Launch Monitor (First 48h)</h3>
      </div>
      <div className="p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Scanning recent launches…</p>
        ) : (data?.recentVideos || []).length === 0 ? (
          <div className="text-center py-6">
            <Rocket className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No videos published in the last 7 days.</p>
          </div>
        ) : (
          <>
            {data?.benchmarks && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Avg Views</p>
                  <p className="text-sm font-mono font-bold text-foreground">{fmtCount(data.benchmarks.avgViews)}</p>
                </div>
                <div className="rounded-lg border border-border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Avg CTR</p>
                  <p className="text-sm font-mono font-bold text-foreground">{data.benchmarks.avgCtr.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Avg Impressions</p>
                  <p className="text-sm font-mono font-bold text-foreground">{fmtCount(data.benchmarks.avgImpressions)}</p>
                </div>
              </div>
            )}

            {data?.recentVideos.map((v: any) => {
              const sc = statusConfig[v.status];
              const StatusIcon = sc.icon;
              return (
                <div key={v.video_id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {v.hoursLive}h live · Published {format(new Date(v.published_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${sc.color}`}>
                      <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Views</p>
                      <p className="text-xs font-mono font-bold text-foreground">{fmtCount(v.views)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">CTR</p>
                      <p className="text-xs font-mono font-bold text-foreground">{v.ctr_percent?.toFixed(1) || "—"}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Impressions</p>
                      <p className="text-xs font-mono font-bold text-foreground">{fmtCount(v.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Engagement</p>
                      <p className="text-xs font-mono font-bold text-foreground">{fmtCount(v.likes + v.comments)}</p>
                    </div>
                  </div>
                  {v.hourlyData.length > 0 && (
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={v.hourlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <XAxis dataKey="hour_number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
