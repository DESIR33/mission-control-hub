import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentRevenueLinker } from "../ContentRevenueLinker";
import { RevenueForecast } from "../RevenueForecast";
import { RevenueIntelligence } from "../RevenueIntelligence";
import { ContentROICalculator } from "../ContentROICalculator";

export function RevenueHubSection() {
  return (
    <Tabs defaultValue="linker" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="linker">Content → Revenue</TabsTrigger>
        <TabsTrigger value="forecast">Forecast</TabsTrigger>
        <TabsTrigger value="intel">Revenue Intel</TabsTrigger>
        <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
      </TabsList>
      <TabsContent value="linker"><ContentRevenueLinker /></TabsContent>
      <TabsContent value="forecast"><RevenueForecast /></TabsContent>
      <TabsContent value="intel"><RevenueIntelligence /></TabsContent>
      <TabsContent value="roi"><ContentROICalculator /></TabsContent>
    </Tabs>
  );
}
