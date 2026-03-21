import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import { useCallback, useMemo } from "react";

/**
 * Hook that provides a Map of youtube_video_id → title
 * from the youtube_video_stats table (which always has titles).
 * Use resolveTitle(videoId, fallbackTitle?) to get a display title.
 */
export function useVideoTitleMap() {
  const { workspaceId } = useWorkspace();

  const { data: titleEntries = [] } = useQuery({
    queryKey: ["video-title-map", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("youtube_video_stats")
        .select("youtube_video_id, title")
        .eq("workspace_id", workspaceId)
        .not("title", "is", null);
      if (error) throw error;
      return (data || []) as { youtube_video_id: string; title: string }[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const titleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of titleEntries) {
      if (entry.title && entry.title !== entry.youtube_video_id) {
        map.set(entry.youtube_video_id, entry.title);
      }
    }
    return map;
  }, [titleEntries]);

  const resolveTitle = useCallback(
    (videoId: string, fallbackTitle?: string | null): string => {
      if (fallbackTitle && fallbackTitle !== videoId) return fallbackTitle;
      return titleMap.get(videoId) || "Untitled Video";
    },
    [titleMap]
  );

  return { titleMap, resolveTitle };
}

/**
 * Enriches an array of objects that have youtube_video_id and optional title,
 * replacing missing/ID-as-title with actual titles from youtube_video_stats.
 */
export function enrichTitles<T extends { youtube_video_id: string; title?: string | null }>(
  items: T[],
  titleMap: Map<string, string>
): T[] {
  return items.map((item) => {
    const hasRealTitle = item.title && item.title !== item.youtube_video_id;
    if (hasRealTitle) return item;
    const resolved = titleMap.get(item.youtube_video_id);
    return { ...item, title: resolved || item.title || "Untitled Video" };
  });
}
