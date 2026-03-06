import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorBenchmark } from "../CompetitorBenchmark";
import { CompetitorIntelligence } from "../CompetitorIntelligence";

export function CompetitorIntelSection() {
  return (
    <Tabs defaultValue="benchmark" className="space-y-4">
      <TabsList>
        <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
        <TabsTrigger value="intel">Deep Intel</TabsTrigger>
      </TabsList>
      <TabsContent value="benchmark"><CompetitorBenchmark /></TabsContent>
      <TabsContent value="intel"><CompetitorIntelligence /></TabsContent>
    </Tabs>
  );
}
