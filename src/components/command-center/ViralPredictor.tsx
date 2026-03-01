import { useState } from "react";
import {
  Zap, TrendingUp, Share2, Eye, ThumbsUp,
  MessageSquare, MousePointerClick, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useViralPotential, type ViralScore } from "@/hooks/use-viral-potential";

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

const tierConfig: Record<string, { color: string; bg: string; label: string }> = {
  viral: { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", label: "Viral" },
  trending: { color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", label: "Trending" },
  solid: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", label: "Solid" },
  average: { color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/30", label: "Average" },
  underperforming: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", label: "Low" },
};

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#eab308" : score >= 50 ? "#22c55e" : score >= 30 ? "#3b82f6" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-foreground">
        {score}
      </span>
    </div>
  );
}

export function ViralPredictor() {
  const { data: analysis, isLoading } = useViralPotential();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No video data available for viral prediction.</p>
      </div>
    );
  }

  const chartData = analysis.videos.slice(0, 15).map((v) => ({
    title: v.title.length > 20 ? v.title.substring(0, 20) + "…" : v.title,
    score: v.viralScore,
    tier: v.tier,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{analysis.avgViralScore}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Viral Potential</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{analysis.potentialViral.length}</p>
          <p className="text-[10px] text-muted-foreground">videos (75+ score)</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 col-span-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Share2 className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Viral Factor</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {analysis.viralFactors[0]?.factor ?? "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            correlation: {((analysis.viralFactors[0]?.correlation ?? 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {analysis.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Zap className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Viral Score Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Viral Scores</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="title" width={110} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Viral Score">
              {chartData.map((entry, i) => {
                const color = entry.score >= 75 ? "#eab308" : entry.score >= 50 ? "#22c55e" : entry.score >= 30 ? "#3b82f6" : "#ef4444";
                return <Cell key={i} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Viral Factors */}
      {analysis.viralFactors.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Viral Factors</h3>
          <div className="space-y-2">
            {analysis.viralFactors.map((f) => (
              <div key={f.factor} className="flex items-center gap-3">
                <p className="text-sm text-foreground flex-1">{f.factor}</p>
                <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-500"
                    style={{ width: `${f.correlation * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                  {(f.correlation * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="space-y-2">
        {analysis.videos.slice(0, 20).map((video) => {
          const tier = tierConfig[video.tier];
          return (
            <div key={video.videoId} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(expanded === video.videoId ? null : video.videoId)}
              >
                <ScoreRing score={video.viralScore} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[9px] ${tier.bg} ${tier.color} border`}>
                      {tier.label}
                    </Badge>
                    {video.factors.slice(0, 2).map((f) => (
                      <span key={f} className="text-[9px] text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </div>
                {expanded === video.videoId ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expanded === video.videoId && (
                <div className="px-3 pb-3 border-t border-border pt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Velocity</p>
                      <p className="text-sm font-mono font-bold text-foreground">{video.velocityScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Shareability</p>
                      <p className="text-sm font-mono font-bold text-foreground">{video.shareabilityScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Engagement</p>
                      <p className="text-sm font-mono font-bold text-foreground">{video.engagementScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">CTR</p>
                      <p className="text-sm font-mono font-bold text-foreground">{video.ctrScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Retention</p>
                      <p className="text-sm font-mono font-bold text-foreground">{video.retentionScore}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
                    <span>{fmtCount(video.views)} views</span>
                    <span>{fmtCount(video.shares)} shares</span>
                    <span>{video.subsGained} subs</span>
                    <span>{video.viewToSubRate.toFixed(2)}% sub rate</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
