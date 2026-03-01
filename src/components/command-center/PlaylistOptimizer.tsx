import {
  ListVideo, TrendingUp, Eye, Clock, Users,
  AlertTriangle, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePlaylistOptimization } from "@/hooks/use-playlist-performance";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export function PlaylistOptimizer() {
  const { data: optimization, isLoading } = usePlaylistOptimization();

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!optimization) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <ListVideo className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No playlist data available. Add playlist analytics to see optimization suggestions.</p>
      </div>
    );
  }

  const chartData = optimization.playlists.slice(0, 10).map((p) => ({
    title: p.playlist_title.length > 25 ? p.playlist_title.substring(0, 25) + "…" : p.playlist_title,
    views: Number(p.total_views),
    completion: Number(p.avg_completion_rate ?? 0),
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ListVideo className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Playlists</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.playlists.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Views</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(optimization.totalViews)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Completion</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.avgCompletionRate.toFixed(1)}%</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Underperform</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{optimization.underperformers.length}</p>
        </div>
      </div>

      {/* Insights */}
      {optimization.insights.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {optimization.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <ArrowUpRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Views Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Playlist Views</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
              <YAxis type="category" dataKey="title" width={130} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtCount(v)} />
              <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Playlist Cards */}
      <div className="space-y-2">
        {optimization.playlists.map((playlist) => (
          <div key={playlist.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">{playlist.playlist_title}</p>
              <Badge variant="secondary" className="text-[9px]">{playlist.video_count} videos</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div>
                <p className="text-muted-foreground">Views</p>
                <p className="font-mono text-foreground">{fmtCount(Number(playlist.total_views))}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completion</p>
                <p className="font-mono text-foreground">{playlist.avg_completion_rate ?? "—"}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sub Gain</p>
                <p className="font-mono text-foreground">{playlist.subscriber_gain ?? 0}</p>
              </div>
            </div>
            {playlist.avg_completion_rate != null && (
              <Progress value={Number(playlist.avg_completion_rate)} className="h-1 mt-2" />
            )}
            {playlist.drop_off_video && (
              <p className="text-[10px] text-red-400 mt-1">Drop-off at: {playlist.drop_off_video}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
