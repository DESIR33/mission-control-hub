import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadTimeAnalyzer } from "../UploadTimeAnalyzer";
import { UploadScheduler } from "../UploadScheduler";

export function UploadThumbnailSection() {
  return (
    <Tabs defaultValue="timing" className="space-y-4">
      <TabsList>
        <TabsTrigger value="timing">Upload Timing</TabsTrigger>
        <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
      </TabsList>
      <TabsContent value="timing"><UploadTimeAnalyzer /></TabsContent>
      <TabsContent value="scheduler"><UploadScheduler /></TabsContent>
    </Tabs>
  );
}
