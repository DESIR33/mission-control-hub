import { useMemo } from "react";
import { useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

export interface RetentionBucket {
  range: string;
  count: number;
  avgViews: number;
  avgSubs: number;
  videos: { title: string; retention: number; views: number }[];
}

export interface RetentionInsight {
  videoId: string;
  title: string;
  retention: number;
  avgDurationSeconds: number;
  views: number;
  subsGained: number;
  category: "excellent" | "good" | "average" | "poor";
}

export interface RetentionAnalysis {
  avgRetention: number;
  medianRetention: number;
  buckets: RetentionBucket[];
  topRetention: RetentionInsight[];
  lowRetention: RetentionInsight[];
  retentionVsViews: { retention: number; views: number; title: string }[];
  insights: string[];
  retentionTrend: { date: string; avgRetention: number }[];
}

function categorize(retention: number): "excellent" | "good" | "average" | "poor" {
  if (retention >= 60) return "excellent";
  if (retention >= 45) return "good";
  if (retention >= 30) return "average";
  return "poor";
}

/** Analyzes audience retention patterns from video analytics data. */
export function useRetentionAnalysis(daysRange = 90) {
  const { data: rawVideos = [], isLoading } = useVideoAnalytics(daysRange);

  const analysis = useMemo((): RetentionAnalysis | null => {
    if (!rawVideos.length) return null;

    // Aggregate per video
    const byVideo = new Map<string, VideoAnalytics[]>();
    rawVideos.forEach((v) => {
      const arr = byVideo.get(v.youtube_video_id) ?? [];
      arr.push(v);
      byVideo.set(v.youtube_video_id, arr);
    });

    const videoInsights: RetentionInsight[] = Array.from(byVideo.entries()).map(([videoId, rows]) => {
      const retention = rows.reduce((s, r) => s + r.average_view_percentage, 0) / rows.length;
      const avgDuration = rows.reduce((s, r) => s + r.average_view_duration_seconds, 0) / rows.length;
      const views = rows.reduce((s, r) => s + r.views, 0);
      const subsGained = rows.reduce((s, r) => s + r.subscribers_gained, 0);
      return {
        videoId,
        title: rows[0].title,
        retention,
        avgDurationSeconds: avgDuration,
        views,
        subsGained,
        category: categorize(retention),
      };
    });

    const retentionValues = videoInsights.map((v) => v.retention).sort((a, b) => a - b);
    const avgRetention = retentionValues.reduce((s, v) => s + v, 0) / retentionValues.length;
    const medianRetention = retentionValues[Math.floor(retentionValues.length / 2)] ?? 0;

    // Buckets
    const bucketDefs = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "20-40%", min: 20, max: 40 },
      { range: "40-60%", min: 40, max: 60 },
      { range: "60-80%", min: 60, max: 80 },
      { range: "80-100%", min: 80, max: 100 },
    ];

    const buckets: RetentionBucket[] = bucketDefs.map(({ range, min, max }) => {
      const inBucket = videoInsights.filter((v) => v.retention >= min && v.retention < max);
      return {
        range,
        count: inBucket.length,
        avgViews: inBucket.length > 0 ? inBucket.reduce((s, v) => s + v.views, 0) / inBucket.length : 0,
        avgSubs: inBucket.length > 0 ? inBucket.reduce((s, v) => s + v.subsGained, 0) / inBucket.length : 0,
        videos: inBucket.map((v) => ({ title: v.title, retention: v.retention, views: v.views })),
      };
    });

    // Sort for top/bottom
    const sorted = [...videoInsights].sort((a, b) => b.retention - a.retention);
    const topRetention = sorted.slice(0, 5);
    const lowRetention = [...sorted].reverse().slice(0, 5);

    // Scatter data
    const retentionVsViews = videoInsights.map((v) => ({
      retention: Math.round(v.retention * 10) / 10,
      views: v.views,
      title: v.title,
    }));

    // Trend over time
    const dailyRetention = new Map<string, { sum: number; count: number }>();
    rawVideos.forEach((v) => {
      const existing = dailyRetention.get(v.date) ?? { sum: 0, count: 0 };
      existing.sum += v.average_view_percentage;
      existing.count += 1;
      dailyRetention.set(v.date, existing);
    });
    const retentionTrend = Array.from(dailyRetention.entries())
      .map(([date, { sum, count }]) => ({ date, avgRetention: Math.round((sum / count) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Insights
    const insights: string[] = [];
    if (avgRetention > 50) {
      insights.push(`Your average retention of ${avgRetention.toFixed(1)}% is above the YouTube average (~40%). Keep it up!`);
    } else if (avgRetention < 30) {
      insights.push(`Average retention of ${avgRetention.toFixed(1)}% is below YouTube average. Focus on stronger hooks and pacing.`);
    }

    const excellent = videoInsights.filter((v) => v.category === "excellent");
    if (excellent.length > 0) {
      insights.push(`${excellent.length} video(s) have excellent retention (60%+) — study their structure.`);
    }

    const poor = videoInsights.filter((v) => v.category === "poor");
    if (poor.length > 0) {
      insights.push(`${poor.length} video(s) have poor retention (<30%) — consider shorter formats or better hooks.`);
    }

    return {
      avgRetention,
      medianRetention,
      buckets,
      topRetention,
      lowRetention,
      retentionVsViews,
      insights,
      retentionTrend,
    };
  }, [rawVideos]);

  return { data: analysis, isLoading };
}
