import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorBenchmark } from "../CompetitorBenchmark";
import { CompetitorIntelligence } from "../CompetitorIntelligence";
import { CompetitorActivityFeed } from "../CompetitorActivityFeed";

export function CompetitorIntelSection() {
  return (
    <Tabs defaultValue="benchmark" className="space-y-4">
      <TabsList>
        <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
        <TabsTrigger value="intel">Deep Intel</TabsTrigger>
        <TabsTrigger value="activity">Activity Feed</TabsTrigger>
      </TabsList>
      <TabsContent value="benchmark"><CompetitorBenchmark /></TabsContent>
      <TabsContent value="intel"><CompetitorIntelligence /></TabsContent>
      <TabsContent value="activity"><CompetitorActivityFeed /></TabsContent>
    </Tabs>
  );
}
