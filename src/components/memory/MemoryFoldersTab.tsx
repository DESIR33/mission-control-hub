import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder, FolderPlus, ChevronRight, ChevronDown, File, Upload,
  MoreHorizontal, Pencil, Trash2, Plus, FileText, Image, FileArchive,
} from "lucide-react";
import { DocumentIngestionStatus } from "@/components/memory/DocumentIngestionStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMemoryFolders, type MemoryFolder, type MemoryAttachment } from "@/hooks/use-memory-folders";
import { safeFormat } from "@/lib/date-utils";

function getFileIcon(mime: string | null) {
  if (!mime) return File;
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf") || mime.includes("document")) return FileText;
  if (mime.includes("zip") || mime.includes("archive")) return FileArchive;
  return File;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FolderNodeProps {
  folder: MemoryFolder;
  folders: MemoryFolder[];
  attachments: MemoryAttachment[];
  depth: number;
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateSub: (parentId: string) => void;
}

function FolderNode({ folder, folders, attachments, depth, selectedFolderId, onSelect, onRename, onDelete, onCreateSub }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const children = folders.filter((f) => f.parent_id === folder.id);
  const fileCount = attachments.filter((a) => a.folder_id === folder.id).length;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group text-sm transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button
          className="p-0.5 hover:bg-muted rounded shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>
        <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
        <span className="flex-1 truncate">{folder.name}</span>
        {fileCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{fileCount}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onCreateSub(folder.id)}>
              <FolderPlus className="w-3.5 h-3.5 mr-2" /> New Sub-folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const name = prompt("Rename folder:", folder.name);
              if (name) onRename(folder.id, name);
            }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(folder.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && children.map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          folders={folders}
          attachments={attachments}
          depth={depth + 1}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onCreateSub={onCreateSub}
        />
      ))}
    </div>
  );
}

export function MemoryFoldersTab() {
  const navigate = useNavigate();
  const { folders, attachments, isLoading, createFolder, renameFolder, deleteFolder, uploadFile, deleteAttachment } = useMemoryFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rootFolders = folders.filter((f) => !f.parent_id);

  const currentFiles = selectedFolderId
    ? attachments.filter((a) => a.folder_id === selectedFolderId)
    : attachments.filter((a) => !a.folder_id);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  // Breadcrumb path
  const breadcrumbs: MemoryFolder[] = [];
  if (selectedFolder) {
    let cur: MemoryFolder | undefined = selectedFolder;
    while (cur) {
      breadcrumbs.unshift(cur);
      cur = folders.find((f) => f.id === cur!.parent_id);
    }
  }

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ name: newFolderName.trim(), parent_id: newFolderParent });
    setNewFolderDialog(false);
    setNewFolderName("");
    setNewFolderParent(null);
  }, [newFolderName, newFolderParent, createFolder]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      uploadFile.mutate({ file, folderId: selectedFolderId });
    });
    e.target.value = "";
  }, [selectedFolderId, uploadFile]);

  const openCreateSub = (parentId: string) => {
    setNewFolderParent(parentId);
    setNewFolderDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted/30 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Sidebar: folder tree */}
      <div className="w-60 shrink-0 border border-border rounded-lg p-2 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-border mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { setNewFolderParent(null); setNewFolderDialog(true); }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Root level */}
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
            !selectedFolderId ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
          )}
          onClick={() => setSelectedFolderId(null)}
        >
          <Folder className="w-4 h-4" />
          <span>All Files</span>
        </div>

        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            folders={folders}
            attachments={attachments}
            depth={0}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
            onRename={(id, name) => renameFolder.mutate({ id, name })}
            onDelete={(id) => deleteFolder.mutate(id)}
            onCreateSub={openCreateSub}
          />
        ))}

        {rootFolders.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            No folders yet. Click + to create one.
          </p>
        )}
      </div>

      {/* Main: file list */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumbs.length > 0 ? (
            <div className="flex items-center gap-1 text-sm">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedFolderId(null)}>
                All Files
              </button>
              {breadcrumbs.map((bc) => (
                <span key={bc.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <button
                    className={cn(
                      "hover:text-foreground",
                      bc.id === selectedFolderId ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                    onClick={() => setSelectedFolderId(bc.id)}
                  >
                    {bc.name}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <h3 className="text-sm font-medium">All Files</h3>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => { setNewFolderParent(selectedFolderId); setNewFolderDialog(true); }}
            >
              <FolderPlus className="w-3.5 h-3.5" /> New Folder
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFile.isPending}
            >
              <Upload className="w-3.5 h-3.5" /> {uploadFile.isPending ? "Uploading…" : "Upload File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Sub-folders in current view */}
        {selectedFolderId && (
          <div className="flex flex-wrap gap-2">
            {folders.filter((f) => f.parent_id === selectedFolderId).map((sub) => (
              <button
                key={sub.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
                onClick={() => setSelectedFolderId(sub.id)}
              >
                <Folder className="w-4 h-4" style={{ color: sub.color }} />
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Files */}
        {currentFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {selectedFolderId ? "No files in this folder." : "No files uploaded yet."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload your first file
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {currentFiles.map((att) => {
              const FileIcon = getFileIcon(att.mime_type);
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors group"
                >
                  <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{att.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(att.file_size)} · {safeFormat(att.created_at, "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteAttachment.mutate(att)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            {newFolderParent && (
              <p className="text-xs text-muted-foreground">
                Inside: {folders.find((f) => f.id === newFolderParent)?.name || "Unknown"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
              {createFolder.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
