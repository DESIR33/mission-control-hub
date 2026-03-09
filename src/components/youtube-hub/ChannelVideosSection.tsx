import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelOverview, VideoDeepDive } from "@/components/analytics";
import { VideoPerformanceSection } from "@/components/command-center/sections/VideoPerformanceSection";
import { useChannelAnalytics, useVideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportChannelReport, exportVideoReport } from "@/lib/pdf-export";
import { subDays } from "date-fns";

export function ChannelVideosSection() {
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

  const handleExportChannel = () => {
    const daysRange = 28;
    const cutoff = subDays(new Date(), daysRange);
    const filtered = channelData.filter((d) => new Date(d.date) >= cutoff);
    exportChannelReport(filtered, daysRange);
  };

  const handleExportVideos = () => {
    exportVideoReport(videoData, publishedAtMap);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Button variant="outline" size="sm" onClick={handleExportChannel} disabled={channelData.length === 0}>
          <FileDown className="w-4 h-4 mr-1.5" />
          Export Channel PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportVideos} disabled={videoData.length === 0}>
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
          <VideoDeepDive data={videoData} />
        </TabsContent>
        <TabsContent value="performance">
          <VideoPerformanceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
