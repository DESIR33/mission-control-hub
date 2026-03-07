import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelOverview, VideoDeepDive } from "@/components/analytics";
import { VideoPerformanceSection } from "@/components/command-center/sections/VideoPerformanceSection";

export function ChannelVideosSection() {
  return (
    <Tabs defaultValue="channel">
      <TabsList>
        <TabsTrigger value="channel">Channel</TabsTrigger>
        <TabsTrigger value="videos">Videos</TabsTrigger>
        <TabsTrigger value="performance">Video Performance</TabsTrigger>
      </TabsList>
      <TabsContent value="channel">
        <ChannelOverview />
      </TabsContent>
      <TabsContent value="videos">
        <VideoDeepDive />
      </TabsContent>
      <TabsContent value="performance">
        <VideoPerformanceSection />
      </TabsContent>
    </Tabs>
  );
}
