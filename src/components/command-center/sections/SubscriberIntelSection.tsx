import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriberImpact } from "../SubscriberImpact";
import { SubGrowthAttribution } from "../SubGrowthAttribution";
import { CohortAnalysis } from "../CohortAnalysis";

export function SubscriberIntelSection() {
  return (
    <Tabs defaultValue="impact" className="space-y-4">
      <TabsList>
        <TabsTrigger value="impact">Sub Impact</TabsTrigger>
        <TabsTrigger value="attribution">Attribution</TabsTrigger>
        <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
      </TabsList>
      <TabsContent value="impact"><SubscriberImpact /></TabsContent>
      <TabsContent value="attribution"><SubGrowthAttribution /></TabsContent>
      <TabsContent value="cohorts"><CohortAnalysis /></TabsContent>
    </Tabs>
  );
}
