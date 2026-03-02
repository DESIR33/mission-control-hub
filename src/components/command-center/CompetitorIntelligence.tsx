import { useState } from "react";
import {
  Users, Plus, TrendingUp, TrendingDown, Minus,
  BarChart3, Trash2, ExternalLink, Medal, Search,
  Eye, Video, RefreshCw, Lightbulb,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useCompetitorChannels,
  useCompetitorBenchmark,
  useCreateCompetitor,
  useDeleteCompetitor,
} from "@/hooks/use-competitor-benchmarking";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

const statusIcon: Record<string, typeof TrendingUp> = {
  ahead: TrendingUp,
  behind: TrendingDown,
  even: Minus,
};
const statusColor: Record<string, string> = {
  ahead: "text-green-400",
  behind: "text-red-400",
  even: "text-gray-400",
};

interface CompetitorTopVideo {
  id: string;
  competitor_id: string;
  workspace_id: string;
  video_id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string | null;
  thumbnail_url: string | null;
}

function useCompetitorTopVideos() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["competitor-top-videos", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_top_videos" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("views", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as CompetitorTopVideo[];
    },
    enabled: !!workspaceId,
  });
}

export function CompetitorIntelligence() {
  const { data: competitors = [], isLoading: channelsLoading } = useCompetitorChannels();
  const { data: benchmark, isLoading: benchmarkLoading } = useCompetitorBenchmark();
  const { data: topVideos = [] } = useCompetitorTopVideos();
  const createCompetitor = useCreateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    channel_name: "",
    channel_url: "",
    subscriber_count: "",
    video_count: "",
    total_view_count: "",
    primary_niche: "",
  });

  const isLoading = channelsLoading || benchmarkLoading;

  const handleAdd = () => {
    if (!form.channel_name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    createCompetitor.mutate(
      {
        channel_name: form.channel_name.trim(),
        channel_url: form.channel_url || null,
        subscriber_count: form.subscriber_count ? Number(form.subscriber_count) : null,
        video_count: form.video_count ? Number(form.video_count) : null,
        total_view_count: form.total_view_count ? Number(form.total_view_count) : null,
        primary_niche: form.primary_niche || null,
      },
      {
        onSuccess: () => {
          setForm({
            channel_name: "",
            channel_url: "",
            subscriber_count: "",
            video_count: "",
            total_view_count: "",
            primary_niche: "",
          });
          setDialogOpen(false);
          toast.success("Competitor added");
        },
      }
    );
  };

  // Build comparison chart data
  const comparisonData = benchmark
    ? benchmark.comparisons.map((comp) => ({
        metric: comp.metric,
        You: comp.yours,
        "Competitor Avg": comp.competitorAvg,
      }))
    : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Competitor Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Competitor Intelligence
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Track Competitor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Empty state */}
        {competitors.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No competitors tracked yet.</p>
            <p className="text-xs mt-1">
              Add competitor channels to see benchmarking data.
            </p>
          </div>
        )}

        {/* Comparison metrics */}
        {benchmark && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {benchmark.comparisons.map((comp) => {
                const Icon = statusIcon[comp.status];
                return (
                  <div
                    key={comp.metric}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon
                        className={`w-3.5 h-3.5 ${statusColor[comp.status]}`}
                      />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {comp.metric}
                      </p>
                    </div>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {fmtCount(comp.yours)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      vs avg {fmtCount(comp.competitorAvg)}
                      <span className={`ml-1 ${statusColor[comp.status]}`}>
                        ({comp.deltaPercent >= 0 ? "+" : ""}
                        {comp.deltaPercent.toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Position Ranking */}
            {benchmark.yourPosition.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5 text-yellow-500" />
                  Your Position
                </h3>
                <div className="flex items-center gap-6">
                  {benchmark.yourPosition.map((p) => (
                    <div key={p.metric} className="text-center">
                      <p className="text-2xl font-bold font-mono text-foreground">
                        #{p.rank}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        of {p.total} &middot; {p.metric}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison Bar Chart */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Your Channel vs Competitors
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => fmtCount(v)}
                  />
                  <Legend />
                  <Bar
                    dataKey="You"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    name="You"
                  />
                  <Bar
                    dataKey="Competitor Avg"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Competitor Avg"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            {benchmark.insights.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  Insights
                </h3>
                <ul className="space-y-1">
                  {benchmark.insights.map((insight, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <BarChart3 className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Content Gap Finder */}
        {topVideos.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-purple-500" />
              Content Gap Finder
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Top competitor videos you may not have covered yet.
            </p>
            <div className="space-y-2">
              {topVideos.slice(0, 8).map((video) => {
                const competitor = competitors.find(
                  (c) => c.id === video.competitor_id
                );
                return (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-2"
                  >
                    <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {competitor && (
                          <span className="truncate max-w-[100px]">
                            {competitor.channel_name}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          {fmtCount(video.views)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-purple-500/15 text-purple-400 border-purple-500/30"
                    >
                      Gap
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitor List */}
        {competitors.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Tracked Competitors
            </h3>
            {competitors.map((comp) => (
              <div
                key={comp.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {comp.channel_name}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {comp.subscriber_count != null && (
                      <span>{fmtCount(comp.subscriber_count)} subs</span>
                    )}
                    {comp.video_count != null && (
                      <span>{comp.video_count} videos</span>
                    )}
                    {comp.total_view_count != null && (
                      <span>{fmtCount(Number(comp.total_view_count))} views</span>
                    )}
                    {comp.last_synced_at && (
                      <span className="flex items-center gap-0.5">
                        <RefreshCw className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(comp.last_synced_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {comp.channel_url && (
                  <a
                    href={comp.channel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-blue-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() =>
                    deleteCompetitor.mutate(comp.id, {
                      onSuccess: () => toast.success("Competitor removed"),
                    })
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Competitor Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track Competitor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border col-span-2"
                  placeholder="Channel name *"
                  value={form.channel_name}
                  onChange={(e) =>
                    setForm({ ...form, channel_name: e.target.value })
                  }
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border col-span-2"
                  placeholder="Channel URL"
                  value={form.channel_url}
                  onChange={(e) =>
                    setForm({ ...form, channel_url: e.target.value })
                  }
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  placeholder="Subscribers"
                  type="number"
                  value={form.subscriber_count}
                  onChange={(e) =>
                    setForm({ ...form, subscriber_count: e.target.value })
                  }
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  placeholder="Video count"
                  type="number"
                  value={form.video_count}
                  onChange={(e) =>
                    setForm({ ...form, video_count: e.target.value })
                  }
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  placeholder="Total views"
                  type="number"
                  value={form.total_view_count}
                  onChange={(e) =>
                    setForm({ ...form, total_view_count: e.target.value })
                  }
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  placeholder="Niche"
                  value={form.primary_niche}
                  onChange={(e) =>
                    setForm({ ...form, primary_niche: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={createCompetitor.isPending}
              >
                {createCompetitor.isPending ? "Adding..." : "Add Competitor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
