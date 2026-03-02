import { useMemo } from "react";
import { useContentRevenue, type ContentRevenueLink } from "@/hooks/use-content-revenue";

/**
 * Wraps useContentRevenue and returns a Map keyed by youtubeVideoId
 * for O(1) lookups by any component that needs per-video revenue data.
 */
export function useVideoRevenueLookup() {
  const { data: summary, isLoading } = useContentRevenue();

  const lookup = useMemo(() => {
    const map = new Map<string, ContentRevenueLink>();
    if (!summary?.links) return map;
    for (const link of summary.links) {
      if (link.youtubeVideoId) {
        map.set(link.youtubeVideoId, link);
      }
    }
    return map;
  }, [summary]);

  return { lookup, summary, isLoading };
}
