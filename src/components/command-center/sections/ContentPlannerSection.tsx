import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentCalendar } from "../ContentCalendar";
import { ContentGapFinder } from "../ContentGapFinder";
import { CollaborationTracker } from "../CollaborationTracker";
import { SmartContentCalendar } from "../SmartContentCalendar";

export function ContentPlannerSection() {
  return (
    <Tabs defaultValue="calendar" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="smart">Smart Calendar</TabsTrigger>
        <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
        <TabsTrigger value="collabs">Collaborations</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar"><ContentCalendar /></TabsContent>
      <TabsContent value="smart"><SmartContentCalendar /></TabsContent>
      <TabsContent value="gaps"><ContentGapFinder /></TabsContent>
      <TabsContent value="collabs"><CollaborationTracker /></TabsContent>
    </Tabs>
  );
}
