import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelOverview, VideoDeepDive } from "@/components/analytics";
import { VideoPerformanceSection } from "@/components/command-center/sections/VideoPerformanceSection";
import { useYouTubeAnalyticsApi } from "@/hooks/use-youtube-analytics-api";

export function ChannelVideosSection() {
  const { data, daysRange } = useYouTubeAnalyticsApi?.() ?? { data: { channelAnalytics: [], videoAnalytics: [] }, daysRange: 28 };
  
  return (
    <Tabs defaultValue="channel">
      <TabsList>
        <TabsTrigger value="channel">Channel</TabsTrigger>
        <TabsTrigger value="videos">Videos</TabsTrigger>
        <TabsTrigger value="performance">Video Performance</TabsTrigger>
      </TabsList>
      <TabsContent value="channel">
        <ChannelOverview data={data?.channelAnalytics ?? []} daysRange={daysRange ?? 28} />
      </TabsContent>
      <TabsContent value="videos">
        <VideoDeepDive data={data?.videoAnalytics ?? []} />
      </TabsContent>
      <TabsContent value="performance">
        <VideoPerformanceSection />
      </TabsContent>
    </Tabs>
  );
}
