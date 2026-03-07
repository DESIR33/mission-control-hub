import {
  MessageSquare, Smile, Frown, Minus, HelpCircle,
  BarChart3, Hash,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useSentimentOverview } from "@/hooks/use-comment-sentiment";
import {
  chartTooltipStyle,
  cartesianGridDefaults,
  xAxisDefaults,
  yAxisDefaults,
  pieDefaults,
  horizontalBarDefaults,
  chartAnimationDefaults,
  chartAxisTickSmall,
} from "@/lib/chart-theme";

const SENTIMENT_COLORS = ["#22c55e", "#64748b", "#ef4444"];

export function CommentSentiment() {
  const { data: overview, isLoading } = useSentimentOverview();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!overview) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No comment sentiment data yet. Run sentiment analysis on your videos to see insights here.</p>
      </div>
    );
  }

  const pieData = [
    { name: "Positive", value: overview.overallPositivePercent },
    { name: "Neutral", value: overview.overallNeutralPercent },
    { name: "Negative", value: overview.overallNegativePercent },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Analyzed</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{overview.totalAnalyzed}</p>
          <p className="text-xs text-muted-foreground">videos</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Smile className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Positive</p>
          </div>
          <p className="text-lg font-bold font-mono text-green-400">{overview.overallPositivePercent.toFixed(1)}%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Minus className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Neutral</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{overview.overallNeutralPercent.toFixed(1)}%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Frown className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Negative</p>
          </div>
          <p className="text-lg font-bold font-mono text-red-400">{overview.overallNegativePercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Overall Sentiment</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                {...pieDefaults}
                label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={SENTIMENT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Keyword Cloud */}
        {overview.commonKeywords.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              Top Keywords
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {overview.commonKeywords.slice(0, 20).map((kw) => {
                const maxCount = overview.commonKeywords[0]?.count ?? 1;
                const size = 0.7 + (kw.count / maxCount) * 0.6;
                return (
                  <Badge
                    key={kw.word}
                    variant="secondary"
                    className="font-mono"
                    style={{ fontSize: `${size}rem` }}
                  >
                    {kw.word} <span className="text-muted-foreground ml-1">{kw.count}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Per-Video Sentiment */}
      {overview.videoSentiments.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Per-Video Sentiment</h3>
          <ResponsiveContainer width="100%" height={Math.min(300, overview.videoSentiments.length * 30 + 40)}>
            <BarChart
              data={overview.videoSentiments.slice(0, 10).map((v) => ({
                title: (v.video_title ?? v.youtube_video_id).substring(0, 25),
                positive: v.positive_count,
                neutral: v.neutral_count,
                negative: v.negative_count,
              }))}
              layout="vertical"
            >
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis type="number" {...xAxisDefaults} />
              <YAxis type="category" dataKey="title" width={130} {...yAxisDefaults} tick={chartAxisTickSmall} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" {...horizontalBarDefaults} {...chartAnimationDefaults} />
              <Bar dataKey="neutral" stackId="a" fill="#64748b" name="Neutral" {...horizontalBarDefaults} {...chartAnimationDefaults} />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" {...horizontalBarDefaults} {...chartAnimationDefaults} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Questions */}
      {overview.topQuestions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-500" />
            Top Questions from Comments
          </h3>
          <div className="space-y-2">
            {overview.topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground mt-0.5">Q{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-foreground">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    from "{q.videoTitle}" · {q.likes} likes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
