import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AudienceDemographics, TrafficSources,
  GeographyBreakdown, DeviceBreakdown,
} from "@/components/analytics";

export function DemographicsReachSection() {
  return (
    <Tabs defaultValue="demographics">
      <TabsList>
        <TabsTrigger value="demographics">Demographics</TabsTrigger>
        <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
        <TabsTrigger value="geography">Geography</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
      </TabsList>
      <TabsContent value="demographics">
        <AudienceDemographics />
      </TabsContent>
      <TabsContent value="traffic">
        <TrafficSources />
      </TabsContent>
      <TabsContent value="geography">
        <GeographyBreakdown />
      </TabsContent>
      <TabsContent value="devices">
        <DeviceBreakdown />
      </TabsContent>
    </Tabs>
  );
}
