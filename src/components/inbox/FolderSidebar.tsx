import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFolderCounts, useCategoryCounts } from "@/hooks/use-smart-inbox";
import {
  InboxIcon,
  SendIcon,
  FileIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  Trash2Icon,
  ListOrdered,
  ClockIcon,
  BookOpenIcon,
  TagIcon,
  CopyIcon,
  SettingsIcon,
  TrendingUpIcon,
  SparklesIcon,
  NewspaperIcon,
  MegaphoneIcon,
  HelpCircleIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeBaseManager } from "@/components/inbox/KnowledgeBaseManager";
import { AutoLabelsManager } from "@/components/inbox/AutoLabelsManager";
import { AutoBccManager } from "@/components/inbox/AutoBccManager";

interface FolderSidebarProps {
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
}

const systemFolders = [
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "snoozed", label: "Snoozed", icon: ClockIcon },
  { key: "sent", label: "Sent", icon: SendIcon },
  { key: "drafts", label: "Drafts", icon: FileIcon },
  { key: "junk", label: "Junk", icon: AlertTriangleIcon },
  { key: "archive", label: "Archive", icon: ArchiveIcon },
  { key: "trash", label: "Trash", icon: Trash2Icon },
];

const categoryFolders = [
  { key: "cat:opportunity", label: "Opportunities", icon: SparklesIcon },
  { key: "cat:newsletter", label: "Newsletters", icon: NewspaperIcon },
  { key: "cat:marketing", label: "Marketing", icon: MegaphoneIcon },
  { key: "cat:unclassified", label: "Unclassified", icon: HelpCircleIcon },
];

export default function FolderSidebar({ selectedFolder, onSelectFolder }: FolderSidebarProps) {
  const { data: folderCounts = {} } = useFolderCounts();
  const { data: categoryCounts = {} } = useCategoryCounts();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-card border-r border-border px-2 py-3">
      <div className="mb-3 px-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Folders</p>
      </div>

      <div className="space-y-0.5">
        {systemFolders.map((folder) => {
          const count = folderCounts[folder.key] ?? 0;
          const isSelected = selectedFolder === folder.key;
          return (
            <button
              key={folder.key}
              onClick={() => onSelectFolder(folder.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                isSelected
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <folder.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{folder.label}</span>
              {count > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Folders */}
      <div className="mt-4 mb-2 px-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Categories</p>
      </div>
      <div className="space-y-0.5">
        {categoryFolders.map((folder) => {
          const catKey = folder.key.replace("cat:", "");
          const count = categoryCounts[catKey] ?? 0;
          const isSelected = selectedFolder === folder.key;
          return (
            <button
              key={folder.key}
              onClick={() => onSelectFolder(folder.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                isSelected
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <folder.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{folder.label}</span>
              {count > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 mb-2 px-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Shortcuts</p>
      </div>
      <div className="px-3 space-y-1 text-[10px] text-muted-foreground">
        <div className="flex justify-between"><span>Command bar</span><kbd className="bg-muted px-1 rounded">⌘K</kbd></div>
        <div className="flex justify-between"><span>Compose</span><kbd className="bg-muted px-1 rounded">C</kbd></div>
        <div className="flex justify-between"><span>Reply</span><kbd className="bg-muted px-1 rounded">R</kbd></div>
        <div className="flex justify-between"><span>Archive</span><kbd className="bg-muted px-1 rounded">E</kbd></div>
        <div className="flex justify-between"><span>Delete</span><kbd className="bg-muted px-1 rounded">#</kbd></div>
        <div className="flex justify-between"><span>Snooze</span><kbd className="bg-muted px-1 rounded">H</kbd></div>
        <div className="flex justify-between"><span>Mute</span><kbd className="bg-muted px-1 rounded">M</kbd></div>
        <div className="flex justify-between"><span>Search</span><kbd className="bg-muted px-1 rounded">/</kbd></div>
      </div>

      {/* Automation */}
      <div className="mt-4 mb-2 px-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Automation</p>
      </div>
      <div className="space-y-0.5">
        <button
          onClick={() => onSelectFolder("sequences")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
            selectedFolder === "sequences"
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <ListOrdered className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">Sequences</span>
        </button>
      </div>

      {/* Settings */}
      <div className="mt-4 mb-2 px-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Settings</p>
      </div>
      <div className="space-y-0.5">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <SettingsIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">Inbox Settings</span>
        </button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inbox Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="knowledge-base">
            <TabsList className="w-full">
              <TabsTrigger value="knowledge-base" className="flex-1 text-xs gap-1">
                <BookOpenIcon className="h-3 w-3" /> Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="auto-labels" className="flex-1 text-xs gap-1">
                <TagIcon className="h-3 w-3" /> Auto Labels
              </TabsTrigger>
              <TabsTrigger value="auto-bcc" className="flex-1 text-xs gap-1">
                <CopyIcon className="h-3 w-3" /> Auto BCC
              </TabsTrigger>
            </TabsList>
            <TabsContent value="knowledge-base" className="mt-4">
              <KnowledgeBaseManager />
            </TabsContent>
            <TabsContent value="auto-labels" className="mt-4">
              <AutoLabelsManager />
            </TabsContent>
            <TabsContent value="auto-bcc" className="mt-4">
              <AutoBccManager />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
