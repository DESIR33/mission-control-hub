import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, Camera, FolderOpen } from "lucide-react";
import { LongTermMemoryTab } from "@/components/memory/LongTermMemoryTab";
import { DailyLogsTab } from "@/components/memory/DailyLogsTab";
import { ServiceSnapshotsTab } from "@/components/memory/ServiceSnapshotsTab";
import { MemoryFoldersTab } from "@/components/memory/MemoryFoldersTab";
import { useAssistantMemory } from "@/hooks/use-assistant-memory";

export function MemoryContent() {
  const memory = useAssistantMemory();

  return (
    <Tabs defaultValue="memory" className="space-y-6">
      <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
        <TabsTrigger value="memory" className="gap-1.5 flex-1 sm:flex-none">
          <BookOpen className="h-3.5 w-3.5" /> Long-Term Memory
        </TabsTrigger>
        <TabsTrigger value="folders" className="gap-1.5 flex-1 sm:flex-none">
          <FolderOpen className="h-3.5 w-3.5" /> Folders & Files
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-1.5 flex-1 sm:flex-none">
          <Brain className="h-3.5 w-3.5" /> Daily Logs
        </TabsTrigger>
        <TabsTrigger value="snapshots" className="gap-1.5 flex-1 sm:flex-none">
          <Camera className="h-3.5 w-3.5" /> Snapshots
        </TabsTrigger>
      </TabsList>

      <TabsContent value="memory">
        <LongTermMemoryTab
          memories={memory.memories}
          searchResults={memory.searchResults}
          isLoading={memory.isLoading}
          originFilter={memory.originFilter}
          onFilterChange={memory.setOriginFilter}
          onSearch={memory.searchMemories}
          onCreate={memory.createMemory}
          onUpdate={memory.updateMemory}
          onDelete={memory.deleteMemory}
        />
      </TabsContent>

      <TabsContent value="folders">
        <MemoryFoldersTab />
      </TabsContent>

      <TabsContent value="logs">
        <DailyLogsTab
          logs={memory.logs}
          logDate={memory.logDate}
          onDateChange={memory.setLogDate}
          onCreate={memory.createLog}
          onDelete={memory.deleteLog}
        />
      </TabsContent>

      <TabsContent value="snapshots">
        <ServiceSnapshotsTab snapshots={memory.snapshots} />
      </TabsContent>
    </Tabs>
  );
}
