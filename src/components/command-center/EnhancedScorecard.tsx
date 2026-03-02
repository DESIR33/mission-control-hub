import { useState, useMemo } from "react";
import {
  Award,
  TrendingUp,
  AlertTriangle,
  Eye,
  MousePointerClick,
  Clock,
  Users,
  DollarSign,
  ThumbsUp,
  ExternalLink,
  BarChart3,
  Lightbulb,
  ArrowUpDown,
  Filter,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useVideoScorecard,
  type VideoScore,
} from "@/hooks/use-video-scorecard";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const truncate = (text: string, maxLen = 48): string =>
  text.length > maxLen ? text.substring(0, maxLen) + "\u2026" : text;

type Grade = VideoScore["grade"];

const GRADE_BADGE_CLASSES: Record<Grade, string> = {
  S: "border-yellow-400/40 bg-yellow-400/15 text-yellow-400",
  A: "border-green-400/40 bg-green-400/15 text-green-400",
  B: "border-blue-400/40 bg-blue-400/15 text-blue-400",
  C: "border-yellow-500/40 bg-yellow-500/15 text-yellow-500",
  D: "border-orange-400/40 bg-orange-400/15 text-orange-400",
  F: "border-red-500/40 bg-red-500/15 text-red-500",
};

const scoreBarColor = (score: number): string => {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#3b82f6";
  if (score >= 25) return "#eab308";
  return "#ef4444";
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

type SortKey = "score" | "views" | "ctr" | "retention";
type GradeFilter = Grade | "ALL";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "views", label: "Views" },
  { value: "ctr", label: "CTR" },
  { value: "retention", label: "Retention" },
];

const GRADE_OPTIONS: GradeFilter[] = ["ALL", "S", "A", "B", "C", "D", "F"];

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[10px] text-muted-foreground w-20 shrink-0">
        {label}
      </p>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: scoreBarColor(score),
          }}
        />
      </div>
      <p className="text-[10px] font-mono text-foreground w-7 text-right">
        {score}
      </p>
    </div>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <Badge
      variant="outline"
      className={`text-sm font-bold px-2.5 py-0.5 ${GRADE_BADGE_CLASSES[grade]}`}
    >
      {grade}
    </Badge>
  );
}

function VideoRadarChart({ video }: { video: VideoScore }) {
  const radarData = [
    { metric: "Views", score: video.viewScore },
    { metric: "CTR", score: video.ctrScore },
    { metric: "Retention", score: video.retentionScore },
    { metric: "Engagement", score: video.engagementScore },
    { metric: "Subs", score: video.subscriberScore },
    { metric: "Revenue", score: video.revenueScore },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function getRecommendations(video: VideoScore): string[] {
  const recs: string[] = [];
  if (video.ctrScore < 50) {
    recs.push(
      "Test a new thumbnail \u2014 your CTR is below channel average"
    );
  }
  if (video.retentionScore < 50) {
    recs.push(
      "Hook viewers in the first 15 seconds \u2014 consider a cold open"
    );
  }
  if (video.engagementScore < 50) {
    recs.push("Add a call-to-action at the 60% mark of the video");
  }
  if (video.subscriberScore < 50) {
    recs.push("Add subscribe CTA and end screen elements");
  }
  return recs;
}

function VideoCard({ video }: { video: VideoScore }) {
  const [expanded, setExpanded] = useState(false);
  const recommendations =
    video.overallScore < 50 ? getRecommendations(video) : [];

  return (
    <Card className="overflow-hidden">
      {/* Card header row */}
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-start gap-3">
          {/* Score + grade */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-2xl font-bold font-mono text-foreground leading-none">
              {video.overallScore}
            </span>
            <GradeBadge grade={video.grade} />
          </div>

          {/* Title + metrics summary */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {truncate(video.title)}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {fmtCount(video.views)} views
              </span>
              <span className="flex items-center gap-1">
                <MousePointerClick className="w-3 h-3" />
                {video.ctr.toFixed(1)}% CTR
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {video.avgViewPercent.toFixed(0)}% retention
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {video.subsGained} subs
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <div className="shrink-0 pt-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Radar chart + score bars side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Radar */}
            <div>
              <VideoRadarChart video={video} />
            </div>

            {/* Score bars */}
            <div className="space-y-2 flex flex-col justify-center">
              <ScoreBar label="Views" score={video.viewScore} />
              <ScoreBar label="CTR" score={video.ctrScore} />
              <ScoreBar label="Retention" score={video.retentionScore} />
              <ScoreBar label="Engagement" score={video.engagementScore} />
              <ScoreBar label="Subscribers" score={video.subscriberScore} />
              <ScoreBar label="Revenue" score={video.revenueScore} />
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Views
              </p>
              <p className="text-sm font-bold font-mono text-foreground">
                {fmtCount(video.views)}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                CTR
              </p>
              <p className="text-sm font-bold font-mono text-foreground">
                {video.ctr.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Retention
              </p>
              <p className="text-sm font-bold font-mono text-foreground">
                {video.avgViewPercent.toFixed(0)}%
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Subs Gained
              </p>
              <p className="text-sm font-bold font-mono text-foreground">
                {fmtCount(video.subsGained)}
              </p>
            </div>
          </div>

          {/* AI Recommendations (only for underperformers) */}
          {recommendations.length > 0 && (
            <div className="rounded-lg border border-orange-400/30 bg-orange-400/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-xs font-semibold text-orange-400">
                  AI Recommendations
                </p>
              </div>
              <ul className="space-y-1.5">
                {recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-orange-400 mt-0.5 shrink-0">
                      &bull;
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/analytics/videos/${video.youtube_video_id}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                View Analytics
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://studio.youtube.com/video/${video.youtube_video_id}/analytics`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                YouTube Studio
              </a>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Summary Bar ────────────────────────────────────────────────────────────

function SummaryBar({
  avgScore,
  topPerformer,
  underperformerCount,
  gradeDistribution,
}: {
  avgScore: number;
  topPerformer: VideoScore | null;
  underperformerCount: number;
  gradeDistribution: Record<Grade, number>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Avg score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-yellow-500" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Average Score
            </p>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {avgScore}
          </p>
        </CardContent>
      </Card>

      {/* Top performer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Top Performer
            </p>
          </div>
          {topPerformer ? (
            <>
              <p className="text-sm font-semibold text-foreground truncate">
                {truncate(topPerformer.title, 36)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Score: {topPerformer.overallScore} ({topPerformer.grade})
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Underperformers */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Underperformers
            </p>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {underperformerCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            videos scoring below 30
          </p>
        </CardContent>
      </Card>

      {/* Grade distribution */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Grade Distribution
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["S", "A", "B", "C", "D", "F"] as Grade[]).map((g) => (
              <span
                key={g}
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${GRADE_BADGE_CLASSES[g]}`}
              >
                {g}:{gradeDistribution[g] ?? 0}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function EnhancedScorecardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary bar skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sort/filter skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Video cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-1.5 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EnhancedScorecard() {
  const { data: scorecard, isLoading } = useVideoScorecard();
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("ALL");
  const [sortAsc, setSortAsc] = useState(false);

  // Derived data
  const gradeDistribution = useMemo(() => {
    const dist: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    if (!scorecard) return dist;
    for (const v of scorecard.videos) {
      dist[v.grade]++;
    }
    return dist;
  }, [scorecard]);

  const sortedFilteredVideos = useMemo(() => {
    if (!scorecard) return [];
    let videos = [...scorecard.videos];

    // Apply grade filter
    if (gradeFilter !== "ALL") {
      videos = videos.filter((v) => v.grade === gradeFilter);
    }

    // Apply sort
    const sortFn = (a: VideoScore, b: VideoScore): number => {
      let diff = 0;
      switch (sortBy) {
        case "score":
          diff = a.overallScore - b.overallScore;
          break;
        case "views":
          diff = a.views - b.views;
          break;
        case "ctr":
          diff = a.ctr - b.ctr;
          break;
        case "retention":
          diff = a.avgViewPercent - b.avgViewPercent;
          break;
      }
      return sortAsc ? diff : -diff;
    };

    videos.sort(sortFn);
    return videos;
  }, [scorecard, sortBy, gradeFilter, sortAsc]);

  // Underperforming videos (score < 50) for the recommendations section
  const underperformingVideos = useMemo(() => {
    if (!scorecard) return [];
    return scorecard.videos.filter((v) => v.overallScore < 50);
  }, [scorecard]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="w-5 h-5 text-yellow-500" />
            Enhanced Video Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedScorecardSkeleton />
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!scorecard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="w-5 h-5 text-yellow-500" />
            Enhanced Video Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              No video data available for scoring.
            </p>
            <p className="text-xs mt-1">
              Upload videos and wait for analytics to populate.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5 text-yellow-500" />
          Enhanced Video Scorecard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Summary Bar */}
        <SummaryBar
          avgScore={scorecard.avgScore}
          topPerformer={scorecard.topPerformer}
          underperformerCount={scorecard.underperformers.length}
          gradeDistribution={gradeDistribution}
        />

        {/* 5. Sort / Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort buttons */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Sort:</span>
            {SORT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={sortBy === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  if (sortBy === opt.value) {
                    setSortAsc((prev) => !prev);
                  } else {
                    setSortBy(opt.value);
                    setSortAsc(false);
                  }
                }}
              >
                {opt.label}
                {sortBy === opt.value && (
                  <span className="ml-0.5 text-[10px]">
                    {sortAsc ? "\u2191" : "\u2193"}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Grade filter */}
          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Grade:</span>
            {GRADE_OPTIONS.map((g) => (
              <Button
                key={g}
                variant={gradeFilter === g ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setGradeFilter(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>

        {/* 2. Video Grid */}
        {sortedFilteredVideos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No videos match the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedFilteredVideos.map((video) => (
              <VideoCard key={video.youtube_video_id} video={video} />
            ))}
          </div>
        )}

        {/* 3. AI Recommendations (aggregate for underperformers) */}
        {underperformingVideos.length > 0 && (
          <div className="rounded-lg border border-orange-400/30 bg-orange-400/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-foreground">
                AI Recommendations
              </h3>
              <Badge variant="outline" className="text-[10px] border-orange-400/40 text-orange-400">
                {underperformingVideos.length} video{underperformingVideos.length !== 1 ? "s" : ""} need attention
              </Badge>
            </div>
            <div className="space-y-3">
              {underperformingVideos.slice(0, 5).map((video) => {
                const recs = getRecommendations(video);
                if (recs.length === 0) return null;
                return (
                  <div key={video.youtube_video_id} className="space-y-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {truncate(video.title, 60)}{" "}
                      <span className="text-muted-foreground font-normal">
                        (Score: {video.overallScore})
                      </span>
                    </p>
                    <ul className="space-y-0.5 pl-3">
                      {recs.map((rec, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex items-start gap-1.5"
                        >
                          <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Insights Section */}
        {scorecard.insights.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Insights
              </h3>
            </div>
            <ul className="space-y-2">
              {scorecard.insights.map((insight, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <Zap className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
