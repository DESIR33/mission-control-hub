import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AudienceDemographics, TrafficSources,
  GeographyBreakdown, DeviceBreakdown,
} from "@/components/analytics";
import { useDemographics, useTrafficSources, useGeography, useDeviceTypes } from "@/hooks/use-youtube-analytics-api";

export function DemographicsReachSection() {
  const { data: demographics = [] } = useDemographics();
  const { data: trafficSources = [] } = useTrafficSources();
  const { data: geography = [] } = useGeography();
  const { data: devices = [] } = useDeviceTypes();

  return (
    <Tabs defaultValue="demographics">
      <TabsList>
        <TabsTrigger value="demographics">Demographics</TabsTrigger>
        <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
        <TabsTrigger value="geography">Geography</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
      </TabsList>
      <TabsContent value="demographics">
        <AudienceDemographics data={demographics} />
      </TabsContent>
      <TabsContent value="traffic">
        <TrafficSources data={trafficSources} daysRange={28} />
      </TabsContent>
      <TabsContent value="geography">
        <GeographyBreakdown data={geography} />
      </TabsContent>
      <TabsContent value="devices">
        <DeviceBreakdown data={devices} />
      </TabsContent>
    </Tabs>
  );
}
