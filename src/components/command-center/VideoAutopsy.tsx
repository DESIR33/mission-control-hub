import { useState, useMemo } from "react";
import {
  Microscope,
  ChevronDown,
  ChevronUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  MousePointerClick,
  Award,
  Lightbulb,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInHours, differenceInDays, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const getGrade = (
  views: number,
  avgViews: number
): { grade: string; color: string } => {
  const ratio = views / (avgViews || 1);
  if (ratio >= 3)
    return {
      grade: "S",
      color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/15",
    };
  if (ratio >= 2)
    return {
      grade: "A",
      color: "text-green-400 border-green-400/40 bg-green-400/15",
    };
  if (ratio >= 1.2)
    return {
      grade: "B",
      color: "text-blue-400 border-blue-400/40 bg-blue-400/15",
    };
  if (ratio >= 0.8)
    return {
      grade: "C",
      color: "text-yellow-500 border-yellow-500/40 bg-yellow-500/15",
    };
  if (ratio >= 0.4)
    return {
      grade: "D",
      color: "text-orange-400 border-orange-400/40 bg-orange-400/15",
    };
  return {
    grade: "F",
    color: "text-red-500 border-red-500/40 bg-red-500/15",
  };
};

const getCheckpointBadge = (
  publishedAt: string
): { label: string; className: string } => {
  const now = new Date();
  const published = new Date(publishedAt);
  const hoursOld = differenceInHours(now, published);
  const daysOld = differenceInDays(now, published);

  if (hoursOld < 48)
    return {
      label: "48h",
      className:
        "bg-orange-500/15 text-orange-400 border-orange-500/40 hover:bg-orange-500/25",
    };
  if (daysOld < 7)
    return {
      label: "7d",
      className:
        "bg-blue-500/15 text-blue-400 border-blue-500/40 hover:bg-blue-500/25",
    };
  if (daysOld < 30)
    return {
      label: "30d",
      className:
        "bg-green-500/15 text-green-400 border-green-500/40 hover:bg-green-500/25",
    };
  return {
    label: "Reviewed",
    className:
      "bg-gray-500/15 text-gray-400 border-gray-500/40 hover:bg-gray-500/25",
  };
};

const getLearnings = (videoId: string): string => {
  try {
    return localStorage.getItem(`autopsy-learnings-${videoId}`) ?? "";
  } catch {
    return "";
  }
};

const saveLearnings = (videoId: string, notes: string) => {
  try {
    localStorage.setItem(`autopsy-learnings-${videoId}`, notes);
  } catch {
    // localStorage unavailable
  }
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function VideoRow({
  video,
  avgViews,
  maxViews,
}: {
  video: any;
  avgViews: number;
  maxViews: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(() =>
    getLearnings(video.youtube_video_id)
  );

  const checkpoint = getCheckpointBadge(video.published_at);
  const { grade, color } = getGrade(video.views ?? 0, avgViews);
  const viewsBarWidth = maxViews > 0 ? ((video.views ?? 0) / maxViews) * 100 : 0;

  const handleBlur = () => {
    saveLearnings(video.youtube_video_id, notes);
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge variant="outline" className={checkpoint.className}>
            {checkpoint.label}
          </Badge>
          <span className="text-sm font-medium truncate">
            {video.title ?? "Untitled"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {video.published_at
              ? format(new Date(video.published_at), "MMM d, yyyy")
              : "—"}
          </span>
          <Badge variant="outline" className={`text-xs font-bold ${color}`}>
            {grade}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10">
          {/* Performance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-3">
            <StatCard
              icon={Eye}
              label="Views"
              value={(video.views ?? 0).toLocaleString()}
            />
            <StatCard
              icon={MousePointerClick}
              label="CTR"
              value={`${(video.ctr_percent ?? 0).toFixed(1)}%`}
            />
            <StatCard
              icon={Clock}
              label="Watch Time"
              value={`${(video.watch_time_minutes ?? 0).toLocaleString()} min`}
            />
            <StatCard
              icon={ThumbsUp}
              label="Likes"
              value={(video.likes ?? 0).toLocaleString()}
            />
            <StatCard
              icon={MessageSquare}
              label="Comments"
              value={(video.comments ?? 0).toLocaleString()}
            />
          </div>

          {/* Grade & Performance Bar */}
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center h-12 w-12 rounded-lg border-2 font-bold text-xl ${color}`}
            >
              {grade}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Views vs. channel average</span>
                <span>
                  {(video.views ?? 0).toLocaleString()} /{" "}
                  {Math.round(avgViews).toLocaleString()} avg
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(viewsBarWidth, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Learnings Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Learnings &amp; Notes</span>
            </div>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y"
              placeholder="What worked? What didn't? Key takeaways..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleBlur}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3" />
              Auto-saves on blur
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PatternTracker({
  videos,
  avgViews,
}: {
  videos: any[];
  avgViews: number;
}) {
  const insights = useMemo(() => {
    if (videos.length === 0) return null;

    const avgCtr =
      videos.reduce((sum, v) => sum + (v.ctr_percent ?? 0), 0) / videos.length;

    const bestVideo = videos.reduce(
      (best, v) => ((v.views ?? 0) > (best.views ?? 0) ? v : best),
      videos[0]
    );

    const avgDuration =
      videos.reduce((sum, v) => sum + (v.avg_view_duration_seconds ?? 0), 0) /
      videos.length;
    const aboveAvgRetention = videos.filter(
      (v) => (v.avg_view_duration_seconds ?? 0) > avgDuration
    );

    const gradeCounts: Record<string, number> = {
      S: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    videos.forEach((v) => {
      const { grade } = getGrade(v.views ?? 0, avgViews);
      gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
    });

    return { avgCtr, bestVideo, aboveAvgRetention, gradeCounts };
  }, [videos, avgViews]);

  if (!insights) return null;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4 text-purple-400" />
          Pattern Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-bold">
              {insights.avgCtr.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">
              Above-Avg Retention
            </p>
            <p className="text-lg font-bold">
              {insights.aboveAvgRetention.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / {videos.length} videos
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Best Performing Video
          </p>
          <p className="text-sm font-medium truncate">
            {insights.bestVideo.title ?? "Untitled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {(insights.bestVideo.views ?? 0).toLocaleString()} views
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Grade Distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(insights.gradeCounts).map(([grade, count]) => {
              const { color } = getGrade(
                grade === "S"
                  ? avgViews * 3
                  : grade === "A"
                    ? avgViews * 2
                    : grade === "B"
                      ? avgViews * 1.2
                      : grade === "C"
                        ? avgViews * 0.8
                        : grade === "D"
                          ? avgViews * 0.4
                          : 0,
                avgViews
              );
              return (
                <Badge
                  key={grade}
                  variant="outline"
                  className={`${color} text-xs`}
                >
                  {grade}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoAutopsy() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: publishedVideos = [], isLoading } = useQuery({
    queryKey: ["published-videos-autopsy", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const avgViews = useMemo(() => {
    if (publishedVideos.length === 0) return 0;
    return (
      publishedVideos.reduce((sum, v) => sum + (v.views ?? 0), 0) /
      publishedVideos.length
    );
  }, [publishedVideos]);

  const maxViews = useMemo(() => {
    if (publishedVideos.length === 0) return 0;
    return Math.max(...publishedVideos.map((v) => v.views ?? 0));
  }, [publishedVideos]);

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Microscope className="h-5 w-5 text-purple-400" />
          Video Autopsy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Post-publish review workflow — analyze performance at key checkpoints
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : publishedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Microscope className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No published videos found</p>
            <p className="text-xs mt-1">
              Videos will appear here once stats are fetched
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {publishedVideos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  avgViews={avgViews}
                  maxViews={maxViews}
                />
              ))}
            </div>
            <PatternTracker videos={publishedVideos} avgViews={avgViews} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
