import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentRevenueLinker } from "../ContentRevenueLinker";
import { RevenueForecast } from "../RevenueForecast";
import { RevenueIntelligence } from "../RevenueIntelligence";
import { ContentROICalculator } from "../ContentROICalculator";
import { RevenueForecast10Month } from "../RevenueForecast10Month";
import { MediaKitGenerator } from "../MediaKitGenerator";
import { SponsorPipeline } from "../SponsorPipeline";

export function RevenueHubSection() {
  return (
    <Tabs defaultValue="linker" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="linker">Content → Revenue</TabsTrigger>
        <TabsTrigger value="forecast">Forecast</TabsTrigger>
        <TabsTrigger value="forecast10">10-Month Plan</TabsTrigger>
        <TabsTrigger value="intel">Revenue Intel</TabsTrigger>
        <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
        <TabsTrigger value="mediakit">Media Kit</TabsTrigger>
        <TabsTrigger value="pipeline">Sponsor Pipeline</TabsTrigger>
      </TabsList>
      <TabsContent value="linker"><ContentRevenueLinker /></TabsContent>
      <TabsContent value="forecast"><RevenueForecast /></TabsContent>
      <TabsContent value="forecast10"><RevenueForecast10Month /></TabsContent>
      <TabsContent value="intel"><RevenueIntelligence /></TabsContent>
      <TabsContent value="roi"><ContentROICalculator /></TabsContent>
      <TabsContent value="mediakit"><MediaKitGenerator /></TabsContent>
      <TabsContent value="pipeline"><SponsorPipeline /></TabsContent>
    </Tabs>
  );
}
