import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CtrOptimizer } from "../CtrOptimizer";
import { ViralPredictor } from "../ViralPredictor";
import { ContentPredictionPanel } from "../ContentPredictionPanel";

export function CtrViralitySection() {
  return (
    <Tabs defaultValue="ctr" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ctr">CTR Optimizer</TabsTrigger>
        <TabsTrigger value="viral">Viral Predictor</TabsTrigger>
        <TabsTrigger value="predictions">Predictions</TabsTrigger>
      </TabsList>
      <TabsContent value="ctr"><CtrOptimizer /></TabsContent>
      <TabsContent value="viral"><ViralPredictor /></TabsContent>
      <TabsContent value="predictions"><ContentPredictionPanel /></TabsContent>
    </Tabs>
  );
}
