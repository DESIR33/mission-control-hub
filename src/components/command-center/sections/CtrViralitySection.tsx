import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CtrOptimizer } from "../CtrOptimizer";
import { ViralPredictor } from "../ViralPredictor";
import { ContentPredictionPanel } from "../ContentPredictionPanel";
import { ABTestLab } from "../ABTestLab";
import { ViralPlaybookPanel } from "@/components/youtube/ViralPlaybookPanel";

export function CtrViralitySection() {
  return (
    <Tabs defaultValue="ctr" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="ctr">CTR Optimizer</TabsTrigger>
        <TabsTrigger value="viral">Viral Predictor</TabsTrigger>
        <TabsTrigger value="playbook">Viral Playbook</TabsTrigger>
        <TabsTrigger value="predictions">Predictions</TabsTrigger>
        <TabsTrigger value="ab_tests">A/B Test Lab</TabsTrigger>
      </TabsList>
      <TabsContent value="ctr"><CtrOptimizer /></TabsContent>
      <TabsContent value="viral"><ViralPredictor /></TabsContent>
      <TabsContent value="playbook"><ViralPlaybookPanel /></TabsContent>
      <TabsContent value="predictions"><ContentPredictionPanel /></TabsContent>
      <TabsContent value="ab_tests"><ABTestLab /></TabsContent>
    </Tabs>
  );
}
