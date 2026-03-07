import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContentPlannerSection } from "@/components/command-center/sections/ContentPlannerSection";
import { VideoStrategist, ContentStrategist } from "@/components/command-center";

export function ContentStrategySection() {
  return (
    <Tabs defaultValue="planner">
      <TabsList>
        <TabsTrigger value="planner">Content Planner</TabsTrigger>
        <TabsTrigger value="optimizer">Video Optimizer</TabsTrigger>
        <TabsTrigger value="strategist">AI Strategist</TabsTrigger>
      </TabsList>
      <TabsContent value="planner">
        <ContentPlannerSection />
      </TabsContent>
      <TabsContent value="optimizer">
        <VideoStrategist />
      </TabsContent>
      <TabsContent value="strategist">
        <ContentStrategist />
      </TabsContent>
    </Tabs>
  );
}
