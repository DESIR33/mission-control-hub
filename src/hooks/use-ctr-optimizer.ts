import { useMemo } from "react";
import { useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";

export interface CtrVideoInsight {
  videoId: string;
  title: string;
  ctr: number;
  impressions: number;
  views: number;
  ctrTier: "top" | "above_avg" | "average" | "below_avg" | "poor";
  opportunity: number; // estimated extra views if CTR improved to avg
}

export interface CtrPattern {
  pattern: string;
  avgCtr: number;
  videoCount: number;
  examples: string[];
}

export interface CtrOptimization {
  avgCtr: number;
  medianCtr: number;
  topCtrVideos: CtrVideoInsight[];
  lowCtrVideos: CtrVideoInsight[];
  allVideos: CtrVideoInsight[];
  titlePatterns: CtrPattern[];
  ctrDistribution: { range: string; count: number }[];
  totalMissedViews: number;
  insights: string[];
}

function ctrTier(ctr: number, avg: number): CtrVideoInsight["ctrTier"] {
  if (ctr >= avg * 1.5) return "top";
  if (ctr >= avg * 1.1) return "above_avg";
  if (ctr >= avg * 0.8) return "average";
  if (ctr >= avg * 0.5) return "below_avg";
  return "poor";
}

/** Analyzes CTR patterns to find optimization opportunities. */
export function useCtrOptimizer(daysRange = 90) {
  const { data: analyticsVideos = [], isLoading: analyticsLoading } = useVideoAnalytics(daysRange);
  const { data: basicVideos = [], isLoading: basicLoading } = useYouTubeVideoStats(200);

  const optimization = useMemo((): CtrOptimization | null => {
    if (!analyticsVideos.length) return null;

    // Aggregate per video
    const byVideo = new Map<string, VideoAnalytics[]>();
    analyticsVideos.forEach((v) => {
      const arr = byVideo.get(v.youtube_video_id) ?? [];
      arr.push(v);
      byVideo.set(v.youtube_video_id, arr);
    });

    const videoData = Array.from(byVideo.entries()).map(([videoId, rows]) => {
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const views = rows.reduce((s, r) => s + r.views, 0);
      return {
        videoId,
        title: rows[0].title,
        impressions,
        views,
        ctr: impressions > 0 ? (views / impressions) * 100 : 0,
      };
    });

    const ctrs = videoData.map((v) => v.ctr).sort((a, b) => a - b);
    const avgCtr = ctrs.reduce((s, c) => s + c, 0) / ctrs.length;
    const medianCtr = ctrs[Math.floor(ctrs.length / 2)] ?? 0;

    const allVideos: CtrVideoInsight[] = videoData.map((v) => {
      const tier = ctrTier(v.ctr, avgCtr);
      const potentialViews = v.impressions * (avgCtr / 100);
      const opportunity = Math.max(0, Math.round(potentialViews - v.views));
      return { ...v, ctrTier: tier, opportunity };
    });

    allVideos.sort((a, b) => b.ctr - a.ctr);

    const topCtrVideos = allVideos.filter((v) => v.ctrTier === "top" || v.ctrTier === "above_avg").slice(0, 10);
    const lowCtrVideos = [...allVideos].reverse().filter((v) => v.ctrTier === "poor" || v.ctrTier === "below_avg").slice(0, 10);

    // CTR distribution
    const ranges = ["0-2%", "2-4%", "4-6%", "6-8%", "8-10%", "10%+"];
    const rangeThresholds = [0, 2, 4, 6, 8, 10, 999];
    const ctrDistribution = ranges.map((range, i) => ({
      range,
      count: allVideos.filter((v) => v.ctr >= rangeThresholds[i] && v.ctr < rangeThresholds[i + 1]).length,
    }));

    // Title pattern analysis
    const patterns: Map<string, { ctrs: number[]; titles: string[] }> = new Map();
    const patternChecks = [
      { pattern: "How to", regex: /how\s+to/i },
      { pattern: "Numbers in title", regex: /\b\d+\b/ },
      { pattern: "Question format", regex: /\?/ },
      { pattern: "List format", regex: /\b(top\s+\d+|\d+\s+(best|ways|tips|tricks|reasons))/i },
      { pattern: "Emoji in title", regex: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u },
      { pattern: "All caps word", regex: /\b[A-Z]{3,}\b/ },
      { pattern: "Parentheses/brackets", regex: /[[\]()]/ },
      { pattern: "Short title (<40 chars)", regex: /^.{1,39}$/ },
      { pattern: "Long title (60+ chars)", regex: /^.{60,}$/ },
    ];

    allVideos.forEach((v) => {
      patternChecks.forEach(({ pattern, regex }) => {
        if (regex.test(v.title)) {
          const existing = patterns.get(pattern) ?? { ctrs: [], titles: [] };
          existing.ctrs.push(v.ctr);
          if (existing.titles.length < 3) existing.titles.push(v.title);
          patterns.set(pattern, existing);
        }
      });
    });

    const titlePatterns: CtrPattern[] = Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        avgCtr: data.ctrs.reduce((s, c) => s + c, 0) / data.ctrs.length,
        videoCount: data.ctrs.length,
        examples: data.titles,
      }))
      .filter((p) => p.videoCount >= 2)
      .sort((a, b) => b.avgCtr - a.avgCtr);

    const totalMissedViews = lowCtrVideos.reduce((s, v) => s + v.opportunity, 0);

    // Insights
    const insights: string[] = [];
    if (avgCtr > 6) {
      insights.push(`Average CTR of ${avgCtr.toFixed(1)}% is strong — above the YouTube 4-5% benchmark.`);
    } else if (avgCtr < 3) {
      insights.push(`Average CTR of ${avgCtr.toFixed(1)}% is below YouTube benchmarks. Prioritize thumbnail/title testing.`);
    }

    if (totalMissedViews > 1000) {
      insights.push(`Fixing low-CTR thumbnails could recover ~${totalMissedViews.toLocaleString()} views.`);
    }

    if (titlePatterns.length > 0) {
      const bestPattern = titlePatterns[0];
      insights.push(`"${bestPattern.pattern}" titles average ${bestPattern.avgCtr.toFixed(1)}% CTR (${bestPattern.videoCount} videos).`);
    }

    return {
      avgCtr,
      medianCtr,
      topCtrVideos,
      lowCtrVideos,
      allVideos,
      titlePatterns,
      ctrDistribution,
      totalMissedViews,
      insights,
    };
  }, [analyticsVideos, basicVideos]);

  return { data: optimization, isLoading: analyticsLoading || basicLoading };
}
