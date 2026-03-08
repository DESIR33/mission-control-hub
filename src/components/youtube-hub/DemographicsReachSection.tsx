import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AudienceDemographics, TrafficSources,
  GeographyBreakdown, DeviceBreakdown,
} from "@/components/analytics";
import { useYouTubeAnalyticsApi } from "@/hooks/use-youtube-analytics-api";

export function DemographicsReachSection() {
  const { data, daysRange } = useYouTubeAnalyticsApi?.() ?? { data: { demographics: [], trafficSources: [], geography: [], devices: [] }, daysRange: 28 };

  return (
    <Tabs defaultValue="demographics">
      <TabsList>
        <TabsTrigger value="demographics">Demographics</TabsTrigger>
        <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
        <TabsTrigger value="geography">Geography</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
      </TabsList>
      <TabsContent value="demographics">
        <AudienceDemographics data={data?.demographics ?? []} />
      </TabsContent>
      <TabsContent value="traffic">
        <TrafficSources data={data?.trafficSources ?? []} daysRange={daysRange ?? 28} />
      </TabsContent>
      <TabsContent value="geography">
        <GeographyBreakdown data={data?.geography ?? []} />
      </TabsContent>
      <TabsContent value="devices">
        <DeviceBreakdown data={data?.devices ?? []} />
      </TabsContent>
    </Tabs>
  );
}
