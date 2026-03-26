import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelOverview, VideoDeepDive } from "@/components/analytics";
import { VideoPerformanceSection } from "@/components/command-center/sections/VideoPerformanceSection";
import { useChannelAnalytics, useVideoAnalytics, type VideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportChannelReport, exportVideoReport } from "@/lib/pdf-export";
import { subDays } from "date-fns";

export function ChannelVideosSection() {
  const { workspaceId } = useWorkspace();
  const { data: channelData = [] } = useChannelAnalytics();
  const { data: videoData = [] } = useVideoAnalytics();
  const { data: videoStatsList } = useYouTubeVideoStats(500);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "channel";

  const publishedAtMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of videoStatsList ?? []) {
      if (v.published_at && !map.has(v.youtube_video_id)) {
        map.set(v.youtube_video_id, v.published_at);
      }
    }
    return map;
  }, [videoStatsList]);

  // Ensure newly synced videos appear even before analytics rows are available.
  const mergedVideoData = useMemo<VideoAnalytics[]>(() => {
    const existingIds = new Set(videoData.map((v) => v.youtube_video_id));

    const fallbackRows: VideoAnalytics[] = (videoStatsList ?? [])
      .filter((v) => !existingIds.has(v.youtube_video_id))
      .map((v) => ({
        id: `stats-${v.id}`,
        workspace_id: workspaceId ?? "",
        youtube_video_id: v.youtube_video_id,
        title: v.title,
        date: (v.published_at ?? v.fetched_at).split("T")[0],
        views: v.views ?? 0,
        estimated_minutes_watched: v.watch_time_minutes ?? 0,
        average_view_duration_seconds: v.avg_view_duration_seconds ?? 0,
        average_view_percentage: 0,
        subscribers_gained: 0,
        subscribers_lost: 0,
        likes: v.likes ?? 0,
        dislikes: 0,
        comments: v.comments ?? 0,
        shares: 0,
        impressions: 0,
        impressions_ctr: Number(v.ctr_percent ?? 0),
        card_clicks: 0,
        card_impressions: 0,
        end_screen_element_clicks: 0,
        end_screen_element_impressions: 0,
        annotation_click_through_rate: 0,
        estimated_revenue: 0,
        fetched_at: v.fetched_at,
      }));

    return [...videoData, ...fallbackRows];
  }, [videoData, videoStatsList, workspaceId]);

  const handleExportChannel = () => {
    const daysRange = 28;
    const cutoff = subDays(new Date(), daysRange);
    const filtered = channelData.filter((d) => new Date(d.date) >= cutoff);
    exportChannelReport(filtered, daysRange);
  };

  const handleExportVideos = () => {
    exportVideoReport(mergedVideoData, publishedAtMap);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Button variant="outline" size="sm" onClick={handleExportChannel} disabled={channelData.length === 0}>
          <FileDown className="w-4 h-4 mr-1.5" />
          Export Channel PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportVideos} disabled={mergedVideoData.length === 0}>
          <FileDown className="w-4 h-4 mr-1.5" />
          Export Videos PDF
        </Button>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="channel">Channel</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="performance">Video Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="channel">
          <ChannelOverview data={channelData} daysRange={28} />
        </TabsContent>
        <TabsContent value="videos">
          <VideoDeepDive data={mergedVideoData} />
        </TabsContent>
        <TabsContent value="performance">
          <VideoPerformanceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
