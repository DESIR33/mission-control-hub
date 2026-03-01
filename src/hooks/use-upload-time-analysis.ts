import { useMemo } from "react";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";

export interface TimeSlot {
  dayOfWeek: string;
  hour: number;
  label: string;
  avgViews: number;
  avgCtr: number;
  avgEngagement: number;
  videoCount: number;
  score: number;
}

export interface UploadTimeAnalysis {
  bestDay: string;
  bestHour: number;
  bestTimeLabel: string;
  bestScore: number;
  heatmap: TimeSlot[];
  topSlots: TimeSlot[];
  worstSlots: TimeSlot[];
  recommendation: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** Analyzes best upload times from video publication timestamps and performance. */
export function useUploadTimeAnalysis() {
  const { data: videos = [], isLoading } = useYouTubeVideoStats(200);

  const analysis = useMemo((): UploadTimeAnalysis | null => {
    const withDates = videos.filter((v) => v.published_at);
    if (withDates.length < 3) return null;

    // Group by day + hour
    const slots = new Map<string, { views: number[]; ctrs: number[]; engagements: number[] }>();

    withDates.forEach((v) => {
      const dt = new Date(v.published_at!);
      const day = dt.getDay();
      const hour = dt.getHours();
      const key = `${day}-${hour}`;

      const existing = slots.get(key) ?? { views: [], ctrs: [], engagements: [] };
      existing.views.push(v.views);
      existing.ctrs.push(v.ctr_percent);
      const engagement = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;
      existing.engagements.push(engagement);
      slots.set(key, existing);
    });

    const timeSlots: TimeSlot[] = [];

    slots.forEach((data, key) => {
      const [dayStr, hourStr] = key.split("-");
      const day = Number(dayStr);
      const hour = Number(hourStr);
      const avgViews = data.views.reduce((s, v) => s + v, 0) / data.views.length;
      const avgCtr = data.ctrs.reduce((s, v) => s + v, 0) / data.ctrs.length;
      const avgEngagement = data.engagements.reduce((s, v) => s + v, 0) / data.engagements.length;

      timeSlots.push({
        dayOfWeek: DAYS[day],
        hour,
        label: `${DAYS_SHORT[day]} ${hourLabel(hour)}`,
        avgViews,
        avgCtr,
        avgEngagement,
        videoCount: data.views.length,
        score: 0,
      });
    });

    if (!timeSlots.length) return null;

    // Normalize and score
    const maxViews = Math.max(...timeSlots.map((s) => s.avgViews));
    const maxCtr = Math.max(...timeSlots.map((s) => s.avgCtr));
    const maxEng = Math.max(...timeSlots.map((s) => s.avgEngagement));

    timeSlots.forEach((slot) => {
      const viewNorm = maxViews > 0 ? slot.avgViews / maxViews : 0;
      const ctrNorm = maxCtr > 0 ? slot.avgCtr / maxCtr : 0;
      const engNorm = maxEng > 0 ? slot.avgEngagement / maxEng : 0;
      const sampleBonus = Math.min(slot.videoCount / 5, 1); // higher confidence with more data
      slot.score = Math.round((viewNorm * 40 + ctrNorm * 30 + engNorm * 30) * sampleBonus);
    });

    timeSlots.sort((a, b) => b.score - a.score);

    const best = timeSlots[0];
    const topSlots = timeSlots.slice(0, 5);
    const worstSlots = [...timeSlots].sort((a, b) => a.score - b.score).slice(0, 3);

    // Build full heatmap
    const heatmap: TimeSlot[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h += 3) {
        const existing = timeSlots.find((s) => s.dayOfWeek === DAYS[d] && s.hour >= h && s.hour < h + 3);
        heatmap.push(
          existing ?? {
            dayOfWeek: DAYS[d],
            hour: h,
            label: `${DAYS_SHORT[d]} ${hourLabel(h)}`,
            avgViews: 0,
            avgCtr: 0,
            avgEngagement: 0,
            videoCount: 0,
            score: 0,
          }
        );
      }
    }

    const recommendation =
      `Upload on ${best.dayOfWeek}s around ${hourLabel(best.hour)} for best performance. ` +
      `Videos posted at this time average ${Math.round(best.avgViews).toLocaleString()} views ` +
      `with ${best.avgCtr.toFixed(1)}% CTR.`;

    return {
      bestDay: best.dayOfWeek,
      bestHour: best.hour,
      bestTimeLabel: best.label,
      bestScore: best.score,
      heatmap,
      topSlots,
      worstSlots,
      recommendation,
    };
  }, [videos]);

  return { data: analysis, isLoading };
}
