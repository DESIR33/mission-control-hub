import { useMemo } from "react";
import { useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

export interface VideoScore {
  youtube_video_id: string;
  title: string;
  overallScore: number; // 0-100
  viewScore: number;
  engagementScore: number;
  ctrScore: number;
  retentionScore: number;
  revenueScore: number;
  subscriberScore: number;
  views: number;
  impressions: number;
  ctr: number;
  avgViewPercent: number;
  engagementRate: number;
  subsGained: number;
  revenue: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
}

export interface ScorecardSummary {
  videos: VideoScore[];
  avgScore: number;
  topPerformer: VideoScore | null;
  underperformers: VideoScore[];
  insights: string[];
}

function scoreToGrade(score: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

function percentile(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  const idx = sorted.findIndex((v) => v >= value);
  if (idx === -1) return 100;
  return Math.round((idx / sorted.length) * 100);
}

/** Computes a performance scorecard for each video based on aggregate analytics. */
export function useVideoScorecard(daysRange = 90) {
  const { data: rawVideos = [], isLoading } = useVideoAnalytics(daysRange);

  const scorecard = useMemo((): ScorecardSummary | null => {
    if (!rawVideos.length) return null;

    // Aggregate per video
    const byVideo = new Map<string, VideoAnalytics[]>();
    rawVideos.forEach((v) => {
      const existing = byVideo.get(v.youtube_video_id) ?? [];
      existing.push(v);
      byVideo.set(v.youtube_video_id, existing);
    });

    const aggregated = Array.from(byVideo.entries()).map(([videoId, rows]) => {
      const title = rows[0].title;
      const views = rows.reduce((s, r) => s + r.views, 0);
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
      const avgViewPercent = rows.reduce((s, r) => s + r.average_view_percentage, 0) / rows.length;
      const likes = rows.reduce((s, r) => s + r.likes, 0);
      const comments = rows.reduce((s, r) => s + r.comments, 0);
      const shares = rows.reduce((s, r) => s + r.shares, 0);
      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
      const subsGained = rows.reduce((s, r) => s + r.subscribers_gained, 0);
      const revenue = rows.reduce((s, r) => s + r.estimated_revenue, 0);
      return { videoId, title, views, impressions, ctr, avgViewPercent, engagementRate, subsGained, revenue };
    });

    // Build sorted arrays for percentile calculations
    const viewsSorted = [...aggregated.map((a) => a.views)].sort((a, b) => a - b);
    const ctrSorted = [...aggregated.map((a) => a.ctr)].sort((a, b) => a - b);
    const retentionSorted = [...aggregated.map((a) => a.avgViewPercent)].sort((a, b) => a - b);
    const engagementSorted = [...aggregated.map((a) => a.engagementRate)].sort((a, b) => a - b);
    const revenueSorted = [...aggregated.map((a) => a.revenue)].sort((a, b) => a - b);
    const subsSorted = [...aggregated.map((a) => a.subsGained)].sort((a, b) => a - b);

    const videos: VideoScore[] = aggregated.map((a) => {
      const viewScore = percentile(a.views, viewsSorted);
      const ctrScore = percentile(a.ctr, ctrSorted);
      const retentionScore = percentile(a.avgViewPercent, retentionSorted);
      const engagementScore = percentile(a.engagementRate, engagementSorted);
      const revenueScore = percentile(a.revenue, revenueSorted);
      const subscriberScore = percentile(a.subsGained, subsSorted);

      // Weighted overall score
      const overallScore = Math.round(
        viewScore * 0.2 +
        ctrScore * 0.2 +
        retentionScore * 0.2 +
        engagementScore * 0.15 +
        subscriberScore * 0.15 +
        revenueScore * 0.1
      );

      return {
        youtube_video_id: a.videoId,
        title: a.title,
        overallScore,
        viewScore,
        engagementScore,
        ctrScore,
        retentionScore,
        revenueScore,
        subscriberScore,
        views: a.views,
        impressions: a.impressions,
        ctr: a.ctr,
        avgViewPercent: a.avgViewPercent,
        engagementRate: a.engagementRate,
        subsGained: a.subsGained,
        revenue: a.revenue,
        grade: scoreToGrade(overallScore),
      };
    });

    videos.sort((a, b) => b.overallScore - a.overallScore);

    const avgScore = Math.round(videos.reduce((s, v) => s + v.overallScore, 0) / videos.length);
    const topPerformer = videos[0] ?? null;
    const underperformers = videos.filter((v) => v.overallScore < 30);

    // Generate insights
    const insights: string[] = [];
    const highCtrLowViews = videos.filter((v) => v.ctrScore > 70 && v.viewScore < 30);
    if (highCtrLowViews.length) {
      insights.push(`${highCtrLowViews.length} video(s) have great CTR but low views — boost impressions with better SEO/promotion.`);
    }
    const lowRetention = videos.filter((v) => v.retentionScore < 20);
    if (lowRetention.length) {
      insights.push(`${lowRetention.length} video(s) have low retention — review pacing and hooks in the first 30 seconds.`);
    }
    const highEngagement = videos.filter((v) => v.engagementScore > 80);
    if (highEngagement.length) {
      insights.push(`${highEngagement.length} video(s) are engagement magnets — replicate their format.`);
    }
    if (topPerformer && topPerformer.overallScore > 80) {
      insights.push(`"${topPerformer.title}" is your standout performer — study why it resonated.`);
    }

    return { videos, avgScore, topPerformer, underperformers, insights };
  }, [rawVideos]);

  return { data: scorecard, isLoading };
}
