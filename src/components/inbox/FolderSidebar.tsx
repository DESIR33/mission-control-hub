import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useFolderCounts } from "@/hooks/use-smart-inbox";
import {
  InboxIcon,
  SendIcon,
  FileIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  Trash2Icon,
  ListOrdered,
} from "lucide-react";

interface FolderSidebarProps {
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
}

const systemFolders = [
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "sent", label: "Sent", icon: SendIcon },
  { key: "drafts", label: "Drafts", icon: FileIcon },
  { key: "junk", label: "Junk", icon: AlertTriangleIcon },
  { key: "archive", label: "Archive", icon: ArchiveIcon },
  { key: "trash", label: "Trash", icon: Trash2Icon },
];

export default function FolderSidebar({ selectedFolder, onSelectFolder }: FolderSidebarProps) {
  const { data: folderCounts = {} } = useFolderCounts();

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
    </div>
  );
}
