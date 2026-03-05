import { WorkspaceProvider } from "@/hooks/use-workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BookOpen, Camera } from "lucide-react";
import { LongTermMemoryTab } from "@/components/memory/LongTermMemoryTab";
import { DailyLogsTab } from "@/components/memory/DailyLogsTab";
import { ServiceSnapshotsTab } from "@/components/memory/ServiceSnapshotsTab";
import { useAssistantMemory } from "@/hooks/use-assistant-memory";
import { motion } from "framer-motion";

function MemoryContent() {
  const memory = useAssistantMemory();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Memory Manager</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse, search, and manage your AI assistant's persistent memory.
        </p>
      </motion.div>

      <Tabs defaultValue="memory" className="space-y-6">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="memory" className="gap-1.5 flex-1 sm:flex-none">
            <BookOpen className="h-3.5 w-3.5" /> Long-Term Memory
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
    </div>
  );
}

export default function MemoryPage() {
  return (
    <WorkspaceProvider>
      <MemoryContent />
    </WorkspaceProvider>
  );
}
