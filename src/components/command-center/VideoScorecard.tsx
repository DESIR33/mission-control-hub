import { useState } from "react";
import {
  Award, TrendingUp, Eye, ThumbsUp, MousePointerClick,
  Clock, Users, DollarSign, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useVideoScorecard, type VideoScore } from "@/hooks/use-video-scorecard";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";
import {
  chartTooltipStyle,
  cartesianGridDefaults,
  xAxisDefaults,
  yAxisDefaults,
  horizontalBarDefaults,
  chartAnimationDefaults,
  fmtCount,
} from "@/lib/chart-theme";

const gradeColor: Record<string, string> = {
  S: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  A: "text-green-400 bg-green-400/10 border-green-400/30",
  B: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  C: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  D: "text-red-400 bg-red-400/10 border-red-400/30",
  F: "text-red-600 bg-red-600/10 border-red-600/30",
};

const scoreBarColor = (score: number) => {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#3b82f6";
  if (score >= 25) return "#eab308";
  return "#ef4444";
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-muted-foreground w-20 shrink-0">{label}</p>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: scoreBarColor(score) }}
        />
      </div>
      <p className="text-xs font-mono text-foreground w-8 text-right">{score}</p>
    </div>
  );
}

export function VideoScorecard() {
  const { data: scorecard, isLoading } = useVideoScorecard();
  const { lookup: companyLookup } = useAllVideoCompanies();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!scorecard) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No video data available for scoring.</p>
      </div>
    );
  }

  const filtered = search
    ? scorecard.videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    : scorecard.videos;

  // Chart data: top 15 by score
  const chartData = filtered.slice(0, 15).map((v) => ({
    title: v.title.length > 25 ? v.title.substring(0, 25) + "…" : v.title,
    score: v.overallScore,
    grade: v.grade,
  }));

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Score</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{scorecard.avgScore}</p>
          <p className="text-xs text-muted-foreground">across {scorecard.videos.length} videos</p>
        </div>

        {scorecard.topPerformer && (
          <div className="rounded-xl border border-border bg-card p-3 col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Performer</p>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{scorecard.topPerformer.title}</p>
            <p className="text-xs text-muted-foreground">Score: {scorecard.topPerformer.overallScore} ({scorecard.topPerformer.grade})</p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Underperforming</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{scorecard.underperformers.length}</p>
          <p className="text-xs text-muted-foreground">videos below 30</p>
        </div>
      </div>

      {/* Insights */}
      {scorecard.insights.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {scorecard.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Zap className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Distribution Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis type="number" domain={[0, 100]} {...xAxisDefaults} />
            <YAxis type="category" dataKey="title" width={120} {...yAxisDefaults} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="score" {...horizontalBarDefaults} {...chartAnimationDefaults}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={scoreBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-1">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0"
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Video List */}
      <div className="space-y-2">
        {filtered.slice(0, 20).map((video) => (
          <div key={video.youtube_video_id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(expanded === video.youtube_video_id ? null : video.youtube_video_id)}
            >
              <span className={`text-base font-bold font-mono px-2 py-0.5 rounded border ${gradeColor[video.grade]}`}>
                {video.grade}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtCount(video.views)} views · {video.ctr.toFixed(1)}% CTR · {video.avgViewPercent.toFixed(0)}% retention
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-foreground">{video.overallScore}</span>
              {expanded === video.youtube_video_id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expanded === video.youtube_video_id && (
              <div className="px-3 pb-3 border-t border-border pt-3 space-y-1.5">
                <ScoreBar label="Views" score={video.viewScore} />
                <ScoreBar label="CTR" score={video.ctrScore} />
                <ScoreBar label="Retention" score={video.retentionScore} />
                <ScoreBar label="Engagement" score={video.engagementScore} />
                <ScoreBar label="Subscribers" score={video.subscriberScore} />
                <ScoreBar label="Revenue" score={video.revenueScore} />
                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span>{fmtCount(video.views)} views</span>
                  <span>{video.subsGained} subs gained</span>
                  <span>${video.revenue.toFixed(2)} revenue</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Zap(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
