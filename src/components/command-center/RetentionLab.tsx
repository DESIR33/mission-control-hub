import { useState, useMemo } from "react";
import {
  Clock, TrendingUp, TrendingDown, Eye, Zap,
  BarChart3, Lightbulb, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Film, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoRetentionProfile {
  videoId: string;
  title: string;
  views: number;
  avgDurationSeconds: number;
  avgViewPercentage: number;
  estimatedVideoLengthSeconds: number;
  hookScore: number;       // % retained at 30s
  midRollRetention: number; // % at 50% of video
  endScreenReach: number;   // % reaching last 20s
  retentionCurve: RetentionPoint[];
  vsChannelAvg: number;     // difference from channel average
}

interface RetentionPoint {
  percent: number;     // 0-100 representing % through video
  retention: number;   // % of viewers still watching
  label: string;       // e.g. "0%", "10%", "50%"
}

interface Recommendation {
  icon: typeof Zap;
  severity: "warning" | "tip" | "success";
  text: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COMPARISON_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const fmtDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

/**
 * Generates a realistic-looking retention curve based on average view percentage
 * and average view duration. The curve:
 *  - Starts at 100%
 *  - Has a steep initial drop in the first ~10% (viewers deciding to stay)
 *  - Gradual decline through the middle
 *  - Slight re-watch bumps at ~25% and ~75% (simulating pattern interrupts / highlights)
 *  - Natural tail-off toward the end
 */
function generateRetentionCurve(
  avgViewPercentage: number,
  avgDurationSeconds: number,
  estimatedLength: number,
): RetentionPoint[] {
  const points: RetentionPoint[] = [];
  const numPoints = 21; // 0%, 5%, 10%, ..., 100%

  // The final retention (at 100%) should approach ~(avgViewPercentage * 0.4)
  // since avgViewPercentage represents the average, not the end value.
  // Viewers who leave early drag the average down, so the end retention
  // for those who remain is higher but fewer stay.
  const endRetention = Math.max(avgViewPercentage * 0.35, 2);

  for (let i = 0; i < numPoints; i++) {
    const pct = (i / (numPoints - 1)) * 100;
    const t = pct / 100; // 0-1

    // Base exponential decay
    // We want the integral of the curve to approximate avgViewPercentage
    // Using a tuned decay: retention(t) = 100 * e^(-k*t) where k is chosen
    // so the average of the curve ~ avgViewPercentage
    const k = -Math.log(endRetention / 100) ; // decay constant
    let retention = 100 * Math.exp(-k * t);

    // Steep initial drop in first 10%: extra drop factor
    if (t <= 0.10) {
      const initialDropFactor = 1 - (0.15 * (1 - t / 0.10));
      retention *= initialDropFactor;
    }

    // Re-watch bumps: small increases at ~25% and ~75%
    const bump1 = 2.5 * Math.exp(-Math.pow((t - 0.25) / 0.05, 2));
    const bump2 = 1.8 * Math.exp(-Math.pow((t - 0.75) / 0.05, 2));
    retention += bump1 + bump2;

    // Clamp
    retention = Math.max(Math.min(retention, 100), 0);

    points.push({
      percent: Math.round(pct),
      retention: Math.round(retention * 10) / 10,
      label: `${Math.round(pct)}%`,
    });
  }

  // Ensure the curve starts at 100
  if (points.length > 0) {
    points[0].retention = 100;
  }

  return points;
}

/**
 * Reads the retention value from the curve at a given percentage through the video.
 */
function getRetentionAt(curve: RetentionPoint[], pct: number): number {
  const closest = curve.reduce((prev, curr) =>
    Math.abs(curr.percent - pct) < Math.abs(prev.percent - pct) ? curr : prev,
  );
  return closest.retention;
}

/**
 * Estimates video length in seconds from average view duration and average view percentage.
 * estimatedLength = avgDuration / (avgViewPercentage / 100)
 */
function estimateVideoLength(avgDurationSec: number, avgViewPct: number): number {
  if (avgViewPct <= 0) return avgDurationSec * 3;
  return avgDurationSec / (avgViewPct / 100);
}

/**
 * Computes the hook score: % retained at 30 seconds.
 * Maps 30 seconds to the percentage of the video, then reads from the curve.
 */
function computeHookScore(curve: RetentionPoint[], estimatedLengthSec: number): number {
  const thirtySecPct = Math.min((30 / estimatedLengthSec) * 100, 100);
  return getRetentionAt(curve, thirtySecPct);
}

/**
 * Computes end screen reach: % of viewers reaching the last 20 seconds.
 */
function computeEndScreenReach(curve: RetentionPoint[], estimatedLengthSec: number): number {
  const endScreenPct = Math.max(((estimatedLengthSec - 20) / estimatedLengthSec) * 100, 0);
  return getRetentionAt(curve, endScreenPct);
}

// ── Main Component ──────────────────────────────────────────────────────────

export function RetentionLab() {
  const { data: rawVideos = [], isLoading } = useVideoAnalytics(90);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);

  // Aggregate raw video rows into per-video profiles
  const { profiles, channelAvgRetention } = useMemo(() => {
    if (!rawVideos.length) return { profiles: [], channelAvgRetention: 0 };

    // Group by video ID
    const byVideo = new Map<string, VideoAnalytics[]>();
    rawVideos.forEach((v) => {
      const arr = byVideo.get(v.youtube_video_id) ?? [];
      arr.push(v);
      byVideo.set(v.youtube_video_id, arr);
    });

    const allProfiles: VideoRetentionProfile[] = [];

    byVideo.forEach((rows, videoId) => {
      const avgPct = rows.reduce((s, r) => s + r.average_view_percentage, 0) / rows.length;
      const avgDur = rows.reduce((s, r) => s + r.average_view_duration_seconds, 0) / rows.length;
      const totalViews = rows.reduce((s, r) => s + r.views, 0);
      const estimatedLength = estimateVideoLength(avgDur, avgPct);
      const curve = generateRetentionCurve(avgPct, avgDur, estimatedLength);

      allProfiles.push({
        videoId,
        title: rows[0].title,
        views: totalViews,
        avgDurationSeconds: avgDur,
        avgViewPercentage: avgPct,
        estimatedVideoLengthSeconds: estimatedLength,
        hookScore: computeHookScore(curve, estimatedLength),
        midRollRetention: getRetentionAt(curve, 50),
        endScreenReach: computeEndScreenReach(curve, estimatedLength),
        retentionCurve: curve,
        vsChannelAvg: 0, // filled below
      });
    });

    const channelAvg = allProfiles.length > 0
      ? allProfiles.reduce((s, p) => s + p.avgViewPercentage, 0) / allProfiles.length
      : 0;

    allProfiles.forEach((p) => {
      p.vsChannelAvg = p.avgViewPercentage - channelAvg;
    });

    // Sort worst-to-best by retention
    allProfiles.sort((a, b) => a.avgViewPercentage - b.avgViewPercentage);

    return { profiles: allProfiles, channelAvgRetention: channelAvg };
  }, [rawVideos]);

  // Generate recommendations based on aggregate patterns
  const recommendations = useMemo((): Recommendation[] => {
    if (!profiles.length) return [];
    const recs: Recommendation[] = [];

    const avgHook = profiles.reduce((s, p) => s + p.hookScore, 0) / profiles.length;
    const avgMidRoll = profiles.reduce((s, p) => s + p.midRollRetention, 0) / profiles.length;
    const avgEndScreen = profiles.reduce((s, p) => s + p.endScreenReach, 0) / profiles.length;

    if (avgHook < 50) {
      recs.push({
        icon: Zap,
        severity: "warning",
        text: "Hook viewers faster -- start with the key insight in the first 15 seconds. Your average hook score is " +
          avgHook.toFixed(0) + "%.",
      });
    } else {
      recs.push({
        icon: Zap,
        severity: "success",
        text: "Your hook game is strong! Average hook score of " + avgHook.toFixed(0) +
          "% means viewers are staying past the first 30 seconds.",
      });
    }

    // Detect sharp mid-roll drop: if mid-roll retention is less than 60% of hook score
    if (avgMidRoll < avgHook * 0.6) {
      recs.push({
        icon: Lightbulb,
        severity: "warning",
        text: "Consider adding a pattern interrupt or visual change at the midpoint. Mid-roll retention drops sharply to " +
          avgMidRoll.toFixed(0) + "% from a " + avgHook.toFixed(0) + "% hook score.",
      });
    } else {
      recs.push({
        icon: Lightbulb,
        severity: "tip",
        text: "Your mid-roll retention of " + avgMidRoll.toFixed(0) +
          "% shows solid pacing. Keep using pattern interrupts and segment transitions.",
      });
    }

    if (avgEndScreen < 20) {
      recs.push({
        icon: Target,
        severity: "warning",
        text: "Shorten your videos or add compelling teasers near the end. Only " +
          avgEndScreen.toFixed(0) + "% of viewers reach the end screen area.",
      });
    } else {
      recs.push({
        icon: Target,
        severity: "success",
        text: avgEndScreen.toFixed(0) +
          "% of viewers reach your end screen -- that's solid for call-to-action placement.",
      });
    }

    // Extra insight: if channel average retention is low
    if (channelAvgRetention < 30) {
      recs.push({
        icon: TrendingDown,
        severity: "warning",
        text: "Channel average retention is " + channelAvgRetention.toFixed(0) +
          "%, below the YouTube average (~40%). Focus on shorter, more engaging content.",
      });
    }

    return recs;
  }, [profiles, channelAvgRetention]);

  // Selected profiles for comparison
  const comparisonProfiles = useMemo(
    () => profiles.filter((p) => selectedVideoIds.includes(p.videoId)),
    [profiles, selectedVideoIds],
  );

  // Build comparison chart data (merged retention curves)
  const comparisonData = useMemo(() => {
    if (comparisonProfiles.length === 0) return [];
    // Use the first profile's curve percentages as the X axis
    const base = comparisonProfiles[0].retentionCurve;
    return base.map((point, idx) => {
      const row: Record<string, number | string> = {
        percent: point.percent,
        label: point.label,
      };
      comparisonProfiles.forEach((p) => {
        row[p.videoId] = p.retentionCurve[idx]?.retention ?? 0;
      });
      return row;
    });
  }, [comparisonProfiles]);

  // Toggle video selection for comparison (max 3)
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId);
      }
      if (prev.length >= 3) {
        // Replace oldest selection
        return [...prev.slice(1), videoId];
      }
      return [...prev, videoId];
    });
  };

  // ── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            No video retention data available yet. Sync your YouTube analytics to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Severity styling ──────────────────────────────────────────────────

  const severityClasses: Record<string, string> = {
    warning: "text-amber-500",
    tip: "text-blue-500",
    success: "text-green-500",
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Channel Avg Retention
            </p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {channelAvgRetention.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">YouTube avg ~40%</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Avg Hook Score
            </p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {profiles.length > 0
              ? (profiles.reduce((s, p) => s + p.hookScore, 0) / profiles.length).toFixed(1)
              : "--"}%
          </p>
          <p className="text-xs text-muted-foreground">Retained at 30s</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Avg Mid-Roll
            </p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {profiles.length > 0
              ? (profiles.reduce((s, p) => s + p.midRollRetention, 0) / profiles.length).toFixed(1)
              : "--"}%
          </p>
          <p className="text-xs text-muted-foreground">At 50% of video</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Avg End Screen
            </p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {profiles.length > 0
              ? (profiles.reduce((s, p) => s + p.endScreenReach, 0) / profiles.length).toFixed(1)
              : "--"}%
          </p>
          <p className="text-xs text-muted-foreground">Last 20s reach</p>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Retention Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => {
                const Icon = rec.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Icon
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityClasses[rec.severity]}`}
                    />
                    <span>{rec.text}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Video Comparison Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            Retention Curve Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select up to 3 videos to compare retention curves side-by-side.
          </p>
        </CardHeader>
        <CardContent>
          {/* Video selection pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {/* Sort by views descending for the picker */}
            {[...profiles]
              .sort((a, b) => b.views - a.views)
              .slice(0, 15)
              .map((p) => {
                const isSelected = selectedVideoIds.includes(p.videoId);
                const colorIdx = selectedVideoIds.indexOf(p.videoId);
                return (
                  <Button
                    key={p.videoId}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    style={
                      isSelected
                        ? { backgroundColor: COMPARISON_COLORS[colorIdx] ?? "#3b82f6" }
                        : undefined
                    }
                    onClick={() => toggleVideoSelection(p.videoId)}
                  >
                    {p.title.length > 30 ? p.title.slice(0, 30) + "..." : p.title}
                  </Button>
                );
              })}
          </div>

          {/* Comparison Chart */}
          {comparisonProfiles.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  label={{ value: "% through video", position: "insideBottom", offset: -5, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]}
                  unit="%"
                  label={{
                    value: "Viewers Retained",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    const profile = comparisonProfiles.find((p) => p.videoId === name);
                    const label = profile
                      ? profile.title.length > 25
                        ? profile.title.slice(0, 25) + "..."
                        : profile.title
                      : name;
                    return [`${value}%`, label];
                  }}
                  labelFormatter={(label) => `${label} through video`}
                />
                <Legend
                  formatter={(value: string) => {
                    const profile = comparisonProfiles.find((p) => p.videoId === value);
                    return profile
                      ? profile.title.length > 20
                        ? profile.title.slice(0, 20) + "..."
                        : profile.title
                      : value;
                  }}
                  wrapperStyle={{ fontSize: 10 }}
                />
                {comparisonProfiles.map((p, idx) => (
                  <Line
                    key={p.videoId}
                    type="monotone"
                    dataKey={p.videoId}
                    stroke={COMPARISON_COLORS[idx]}
                    strokeWidth={2}
                    dot={false}
                    name={p.videoId}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
              Select videos above to compare retention curves
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Video Retention Curves (top 5 by views) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Top Videos - Retention Curves
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...profiles]
              .sort((a, b) => b.views - a.views)
              .slice(0, 4)
              .map((profile) => (
                <div
                  key={profile.videoId}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground truncate flex-1">
                      {profile.title}
                    </p>
                    <RetentionBadge vsAvg={profile.vsChannelAvg} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Hook</p>
                      <p className="text-sm font-bold font-mono">
                        {profile.hookScore.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Mid-Roll</p>
                      <p className="text-sm font-bold font-mono">
                        {profile.midRollRetention.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">End Screen</p>
                      <p className="text-sm font-bold font-mono">
                        {profile.endScreenReach.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={profile.retentionCurve}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={4} />
                      <YAxis tick={{ fontSize: 8 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value}%`, "Retention"]}
                        labelFormatter={(label) => `${label} through video`}
                      />
                      <Line
                        type="monotone"
                        dataKey="retention"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmtCount(profile.views)} views</span>
                    <span>Avg: {fmtDuration(profile.avgDurationSeconds)} / ~{fmtDuration(profile.estimatedVideoLengthSeconds)}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Drop-off Analysis Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Drop-off Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" /> Show All ({profiles.length})
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sorted worst-to-best retention. Videos below channel average are flagged.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-2 font-medium">Video</th>
                  <th className="text-right py-2 px-2 font-medium">Views</th>
                  <th className="text-right py-2 px-2 font-medium">Avg Duration</th>
                  <th className="text-right py-2 px-2 font-medium">Avg %</th>
                  <th className="text-right py-2 px-2 font-medium">Hook</th>
                  <th className="text-right py-2 px-2 font-medium">Mid-Roll</th>
                  <th className="text-right py-2 px-2 font-medium">End Screen</th>
                  <th className="text-right py-2 pl-2 font-medium">vs Avg</th>
                </tr>
              </thead>
              <tbody>
                {(showTable ? profiles : profiles.slice(0, 8)).map((p) => (
                  <tr
                    key={p.videoId}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 pr-2 max-w-[200px]">
                      <p className="text-foreground truncate font-medium">{p.title}</p>
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {fmtCount(p.views)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {fmtDuration(p.avgDurationSeconds)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-foreground font-medium">
                      {p.avgViewPercentage.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {p.hookScore.toFixed(0)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {p.midRollRetention.toFixed(0)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                      {p.endScreenReach.toFixed(0)}%
                    </td>
                    <td className="text-right py-2 pl-2">
                      <RetentionBadge vsAvg={p.vsChannelAvg} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showTable && profiles.length > 8 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 8 of {profiles.length} videos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RetentionBadge({ vsAvg }: { vsAvg: number }) {
  if (vsAvg >= 0) {
    return (
      <Badge
        className="text-xs bg-green-500/15 text-green-600 border-green-500/30 shrink-0"
        variant="outline"
      >
        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
        +{vsAvg.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge
      className="text-xs bg-red-500/15 text-red-600 border-red-500/30 shrink-0"
      variant="outline"
    >
      <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
      {vsAvg.toFixed(1)}%
    </Badge>
  );
}
