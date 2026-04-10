import { useState } from "react";
import { Bookmark, Pin, PinOff, Trash2, Pencil, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTaskSavedViews, type TaskSavedView } from "@/hooks/use-task-saved-views";
import type { TaskFilters, TaskStatus, TaskPriority } from "@/types/tasks";
import { toast } from "sonner";

type ViewType = "list" | "board" | "calendar" | "inbox";

interface SavedViewsBarProps {
  currentView: ViewType;
  statusFilter: TaskStatus[];
  priorityFilter: TaskPriority[];
  search: string;
  activeDomainId: string | null;
  activeViewId: string | null;
  onApplyView: (view: TaskSavedView) => void;
  onClearView: () => void;
}

export function SavedViewsBar({
  currentView,
  statusFilter,
  priorityFilter,
  search,
  activeDomainId,
  activeViewId,
  onApplyView,
  onClearView,
}: SavedViewsBarProps) {
  const { views, createView, deleteView, togglePin, updateView } = useTaskSavedViews();
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleSave = () => {
    if (!newName.trim()) return;
    const filters: TaskFilters = {};
    if (statusFilter.length) filters.status = statusFilter;
    if (priorityFilter.length) filters.priority = priorityFilter;
    if (search) filters.search = search;
    if (activeDomainId) filters.domain_id = activeDomainId;

    createView.mutate(
      {
        name: newName.trim(),
        icon: newIcon.trim() || null,
        view_type: currentView,
        filters,
        sort_config: {},
        group_by: null,
        is_pinned: false,
        sort_order: views.length,
      },
      {
        onSuccess: () => {
          toast.success("View saved");
          setSaveOpen(false);
          setNewName("");
          setNewIcon("");
        },
      }
    );
  };

  const pinnedViews = views.filter((v) => v.is_pinned);
  const unpinnedViews = views.filter((v) => !v.is_pinned);

  if (views.length === 0 && !saveOpen) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" onClick={() => setSaveOpen(true)}>
          <Bookmark className="h-3.5 w-3.5" />
          Save view
        </Button>
        <SaveViewDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          name={newName}
          onNameChange={setNewName}
          icon={newIcon}
          onIconChange={setNewIcon}
          onSave={handleSave}
          loading={createView.isPending}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <ScrollArea className="max-w-[calc(100vw-16rem)]">
          <div className="flex items-center gap-1.5 pb-1">
            {[...pinnedViews, ...unpinnedViews].map((v) => (
              <button
                key={v.id}
                onClick={() => (activeViewId === v.id ? onClearView() : onApplyView(v))}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  activeViewId === v.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {v.icon && <span>{v.icon}</span>}
                {v.name}
                {v.is_pinned && <Pin className="h-3 w-3 text-primary/50" />}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground shrink-0" onClick={() => setSaveOpen(true)}>
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground shrink-0" onClick={() => setManageOpen(true)}>
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <SaveViewDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        name={newName}
        onNameChange={setNewName}
        icon={newIcon}
        onIconChange={setNewIcon}
        onSave={handleSave}
        loading={createView.isPending}
      />

      {/* Manage Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Saved Views</DialogTitle>
            <DialogDescription>Reorder, pin, rename, or delete your saved views.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {views.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No saved views yet.</p>}
            {views.map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                {editingId === v.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateView.mutate({ id: v.id, name: editName });
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => {
                      if (editName.trim() && editName !== v.name) {
                        updateView.mutate({ id: v.id, name: editName });
                      }
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">
                    {v.icon && <span className="mr-1">{v.icon}</span>}
                    {v.name}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] shrink-0">{v.view_type}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    setEditingId(v.id);
                    setEditName(v.name);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => togglePin.mutate({ id: v.id, is_pinned: !v.is_pinned })}
                >
                  {v.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this saved view?")) {
                      deleteView.mutate(v.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveViewDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  icon,
  onIconChange,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  icon: string;
  onIconChange: (v: string) => void;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
          <DialogDescription>Save your current filters and view configuration for quick access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. High priority inbox"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && onSave()}
            />
          </div>
          <div>
            <Label className="text-xs">Icon (optional emoji)</Label>
            <Input value={icon} onChange={(e) => onIconChange(e.target.value)} placeholder="📌" className="w-20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={!name.trim() || loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
