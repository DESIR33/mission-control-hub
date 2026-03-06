import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoScorecard } from "../VideoScorecard";
import { EnhancedScorecard } from "../EnhancedScorecard";
import { RetentionAnalyzer } from "../RetentionAnalyzer";
import { RetentionLab } from "../RetentionLab";

export function VideoPerformanceSection() {
  return (
    <Tabs defaultValue="scorecard" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
        <TabsTrigger value="enhanced">Enhanced Scorecard</TabsTrigger>
        <TabsTrigger value="retention">Retention</TabsTrigger>
        <TabsTrigger value="retention_lab">Retention Lab</TabsTrigger>
      </TabsList>
      <TabsContent value="scorecard"><VideoScorecard /></TabsContent>
      <TabsContent value="enhanced"><EnhancedScorecard /></TabsContent>
      <TabsContent value="retention"><RetentionAnalyzer /></TabsContent>
      <TabsContent value="retention_lab"><RetentionLab /></TabsContent>
    </Tabs>
  );
}
