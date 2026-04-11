import { useMemo } from "react";
import { useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { safeGetTime } from "@/lib/date-utils";

export interface ViralScore {
  videoId: string;
  title: string;
  viralScore: number; // 0-100
  velocityScore: number;
  shareabilityScore: number;
  engagementScore: number;
  ctrScore: number;
  retentionScore: number;
  views: number;
  shares: number;
  likes: number;
  comments: number;
  ctr: number;
  retention: number;
  subsGained: number;
  viewToSubRate: number;
  tier: "viral" | "trending" | "solid" | "average" | "underperforming";
  factors: string[];
}

export interface ViralAnalysis {
  videos: ViralScore[];
  avgViralScore: number;
  viralThreshold: number;
  potentialViral: ViralScore[];
  viralFactors: { factor: string; correlation: number }[];
  insights: string[];
}

function viralTier(score: number): ViralScore["tier"] {
  if (score >= 85) return "viral";
  if (score >= 70) return "trending";
  if (score >= 50) return "solid";
  if (score >= 30) return "average";
  return "underperforming";
}

/** Predicts viral potential of videos based on early performance signals. */
export function useViralPotential(daysRange = 90) {
  const { data: analyticsVideos = [], isLoading: analyticsLoading } = useVideoAnalytics(daysRange);
  const { data: basicVideos = [], isLoading: basicLoading } = useYouTubeVideoStats(200);

  const analysis = useMemo((): ViralAnalysis | null => {
    if (!analyticsVideos.length) return null;

    // Aggregate per video
    const byVideo = new Map<string, VideoAnalytics[]>();
    analyticsVideos.forEach((v) => {
      const arr = byVideo.get(v.youtube_video_id) ?? [];
      arr.push(v);
      byVideo.set(v.youtube_video_id, arr);
    });

    const videoMetrics = Array.from(byVideo.entries()).map(([videoId, rows]) => {
      const views = rows.reduce((s, r) => s + r.views, 0);
      const shares = rows.reduce((s, r) => s + r.shares, 0);
      const likes = rows.reduce((s, r) => s + r.likes, 0);
      const comments = rows.reduce((s, r) => s + r.comments, 0);
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
      const retention = rows.reduce((s, r) => s + r.average_view_percentage, 0) / rows.length;
      const subsGained = rows.reduce((s, r) => s + r.subscribers_gained, 0);
      const viewToSubRate = views > 0 ? (subsGained / views) * 100 : 0;

      // Velocity: views per day since first data point
      const dates = rows.map((r) => safeGetTime(r.date)).sort();
      const daySpan = dates.length > 1 ? (dates[dates.length - 1] - dates[0]) / 86400000 : 1;
      const velocity = views / Math.max(daySpan, 1);

      return {
        videoId,
        title: rows[0].title,
        views, shares, likes, comments, ctr, retention,
        subsGained, viewToSubRate, velocity, impressions,
      };
    });

    // Normalize all metrics
    const maxViews = Math.max(...videoMetrics.map((v) => v.views), 1);
    const maxShares = Math.max(...videoMetrics.map((v) => v.shares), 1);
    const maxVelocity = Math.max(...videoMetrics.map((v) => v.velocity), 1);
    const maxCtr = Math.max(...videoMetrics.map((v) => v.ctr), 1);
    const maxRetention = Math.max(...videoMetrics.map((v) => v.retention), 1);
    const maxEngRate = Math.max(
      ...videoMetrics.map((v) => (v.views > 0 ? (v.likes + v.comments) / v.views : 0)),
      0.001
    );

    const videos: ViralScore[] = videoMetrics.map((v) => {
      const velocityNorm = v.velocity / maxVelocity;
      const shareNorm = v.shares / maxShares;
      const engRate = v.views > 0 ? (v.likes + v.comments) / v.views : 0;
      const engNorm = engRate / maxEngRate;
      const ctrNorm = v.ctr / maxCtr;
      const retNorm = v.retention / maxRetention;

      const velocityScore = Math.round(velocityNorm * 100);
      const shareabilityScore = Math.round(shareNorm * 100);
      const engagementScore = Math.round(engNorm * 100);
      const ctrScore = Math.round(ctrNorm * 100);
      const retentionScore = Math.round(retNorm * 100);

      // Weighted viral score
      const viralScore = Math.round(
        velocityScore * 0.25 +
        shareabilityScore * 0.20 +
        engagementScore * 0.20 +
        ctrScore * 0.20 +
        retentionScore * 0.15
      );

      // Identify viral factors
      const factors: string[] = [];
      if (shareabilityScore > 70) factors.push("High share rate");
      if (velocityScore > 70) factors.push("Fast view velocity");
      if (engagementScore > 70) factors.push("Strong engagement");
      if (ctrScore > 70) factors.push("Eye-catching thumbnail");
      if (retentionScore > 70) factors.push("Great retention");
      if (v.viewToSubRate > 1) factors.push("Strong sub conversion");

      return {
        videoId: v.videoId,
        title: v.title,
        viralScore,
        velocityScore,
        shareabilityScore,
        engagementScore,
        ctrScore,
        retentionScore,
        views: v.views,
        shares: v.shares,
        likes: v.likes,
        comments: v.comments,
        ctr: v.ctr,
        retention: v.retention,
        subsGained: v.subsGained,
        viewToSubRate: v.viewToSubRate,
        tier: viralTier(viralScore),
        factors,
      };
    });

    videos.sort((a, b) => b.viralScore - a.viralScore);

    const avgViralScore = Math.round(videos.reduce((s, v) => s + v.viralScore, 0) / videos.length);
    const viralThreshold = 75;
    const potentialViral = videos.filter((v) => v.viralScore >= viralThreshold);

    // Factor correlation analysis
    const factorCounts = new Map<string, { count: number; totalScore: number }>();
    videos.forEach((v) => {
      v.factors.forEach((f) => {
        const existing = factorCounts.get(f) ?? { count: 0, totalScore: 0 };
        existing.count++;
        existing.totalScore += v.viralScore;
        factorCounts.set(f, existing);
      });
    });

    const viralFactors = Array.from(factorCounts.entries())
      .map(([factor, data]) => ({
        factor,
        correlation: data.totalScore / data.count / 100,
      }))
      .sort((a, b) => b.correlation - a.correlation);

    // Insights
    const insights: string[] = [];
    if (potentialViral.length > 0) {
      insights.push(`${potentialViral.length} video(s) show viral potential (score 75+) — promote them aggressively.`);
    }

    if (viralFactors.length > 0) {
      insights.push(`Top viral factor: "${viralFactors[0].factor}" — optimize for this in future content.`);
    }

    const highShareLowView = videos.filter((v) => v.shareabilityScore > 60 && v.views < maxViews * 0.3);
    if (highShareLowView.length > 0) {
      insights.push(`${highShareLowView.length} highly shareable video(s) need more initial impressions to break through.`);
    }

    return {
      videos,
      avgViralScore,
      viralThreshold,
      potentialViral,
      viralFactors,
      insights,
    };
  }, [analyticsVideos, basicVideos]);

  return { data: analysis, isLoading: analyticsLoading || basicLoading };
}
