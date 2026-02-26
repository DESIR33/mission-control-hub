import { useCallback, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios-config";
import { cn } from "@/lib/utils";
import {
  InboxIcon,
  SendIcon,
  FileIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  Trash2Icon,
  FolderIcon,
} from "lucide-react";

interface Folder {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  emailCount: number;
  sortOrder: number;
}

interface FolderSidebarProps {
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  onDropEmail: (emailIds: string[], destinationFolder: string) => void;
}

const systemFolders = [
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "sent", label: "Sent", icon: SendIcon },
  { key: "drafts", label: "Drafts", icon: FileIcon },
  { key: "junk", label: "Junk", icon: AlertTriangleIcon },
  { key: "archive", label: "Archive", icon: ArchiveIcon },
  { key: "trash", label: "Trash", icon: Trash2Icon },
];

export default function FolderSidebar({ selectedFolder, onSelectFolder, onDropEmail }: FolderSidebarProps) {
  const { data: folders = [] } = useQuery({
    queryKey: ["/api/inbox/folders-list"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/inbox/folders-list");
        return Array.isArray(response.data) ? response.data as Folder[] : [];
      } catch {
        return [];
      }
    },
  });

  const customFolders = folders.filter((f) => f.type === "custom");

  const handleDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("bg-primary/10");
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.currentTarget.classList.remove("bg-primary/10");
  }, []);

  const handleDrop = useCallback(
    (folderKey: string) => (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.classList.remove("bg-primary/10");

      const rawIds = event.dataTransfer.getData("application/x-desmily-email-ids");
      const plainId = event.dataTransfer.getData("text/plain");

      let emailIds: string[] = [];
      if (rawIds) {
        try {
          emailIds = JSON.parse(rawIds);
        } catch {
          emailIds = plainId ? [plainId] : [];
        }
      } else if (plainId) {
        emailIds = [plainId];
      }

      if (emailIds.length > 0) {
        onDropEmail(emailIds, folderKey);
      }
    },
    [onDropEmail],
  );

  const getFolderCount = (key: string) => {
    const nameMap: Record<string, string> = {
      inbox: "Inbox",
      sent: "Sent",
      drafts: "Drafts",
      junk: "Junk",
      archive: "Archive",
      trash: "Trash",
    };
    const match = folders.find((f) => f.name === nameMap[key]);
    return match?.emailCount ?? 0;
  };

  return (
    <div className="h-full overflow-y-auto bg-card border-r border-border px-2 py-3">
      <div className="mb-3 px-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Folders</p>
      </div>

      <div className="space-y-0.5">
        {systemFolders.map((folder) => {
          const count = getFolderCount(folder.key);
          const isSelected = selectedFolder === folder.key;
          return (
            <button
              key={folder.key}
              onClick={() => onSelectFolder(folder.key)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(folder.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                isSelected
                  ? "bg-primary/10 text-primary font-medium shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]"
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

      {customFolders.length > 0 && (
        <>
          <div className="mt-4 mb-2 px-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custom</p>
          </div>
          <div className="space-y-0.5">
            {customFolders.map((folder) => {
              const folderKey = `folder-${folder.id}`;
              const isSelected = selectedFolder === folderKey;
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folderKey)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(folderKey)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <FolderIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  {folder.emailCount > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">{folder.emailCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
