import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrowthForecast } from "../GrowthForecast";
import { MilestoneCountdown } from "../MilestoneCountdown";

export function GrowthForecastSection() {
  return (
    <Tabs defaultValue="forecast" className="space-y-4">
      <TabsList>
        <TabsTrigger value="forecast">Growth Forecast</TabsTrigger>
        <TabsTrigger value="milestones">Milestones</TabsTrigger>
      </TabsList>
      <TabsContent value="forecast"><GrowthForecast /></TabsContent>
      <TabsContent value="milestones"><MilestoneCountdown /></TabsContent>
    </Tabs>
  );
}
