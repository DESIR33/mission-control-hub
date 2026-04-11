import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import type { Memory, MemoryOrigin } from "@/types/assistant";
import { safeFormat } from "@/lib/date-utils";

const ORIGINS: MemoryOrigin[] = [
  "youtube", "crm", "email", "strategy", "preference", "manual",
];
const originIcons: Record<string, string> = {
  youtube: "🎥", crm: "👤", email: "📧", strategy: "🎯", preference: "⚙️", manual: "📝",
};

interface Props {
  memories: Memory[];
  searchResults: Memory[] | null;
  isLoading: boolean;
  originFilter: string;
  onFilterChange: (origin: string) => void;
  onSearch: (query: string, origin?: string) => void;
  onCreate: (content: string, origin: MemoryOrigin, tags: string[]) => void;
  onUpdate: (id: string, content: string, origin: MemoryOrigin, tags: string[]) => void;
  onDelete: (id: string) => void;
}

export function LongTermMemoryTab({
  memories, searchResults, isLoading, originFilter,
  onFilterChange, onSearch, onCreate, onUpdate, onDelete,
}: Props) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [formContent, setFormContent] = useState("");
  const [formOrigin, setFormOrigin] = useState<MemoryOrigin>("manual");
  const [formTags, setFormTags] = useState("");

  const display = searchResults || memories;

  const openCreate = () => {
    setEditing(null);
    setFormContent("");
    setFormOrigin("manual");
    setFormTags("");
    setDialogOpen(true);
  };

  const openEdit = (m: Memory) => {
    setEditing(m);
    setFormContent(m.content);
    setFormOrigin(m.origin);
    setFormTags(m.tags.join(", "));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editing) {
      onUpdate(editing.id, formContent, formOrigin, tags);
    } else {
      onCreate(formContent, formOrigin, tags);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onSearch(searchQuery, originFilter !== "all" ? originFilter : undefined)
            }
            className="pl-9"
          />
        </div>
        <Select value={originFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {ORIGINS.map((o) => (
              <SelectItem key={o} value={o}>
                {originIcons[o]} {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {searchResults && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{searchResults.length} results</Badge>
          <Button variant="ghost" size="sm" onClick={() => onSearch("")}>
            Clear search
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {display.map((m) => (
          <Card
            key={m.id}
            className="p-3 group hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/memory/${m.id}`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{originIcons[m.origin]}</span>
                <Badge variant="outline" className="text-xs h-4">
                  {m.origin}
                </Badge>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground line-clamp-4">{m.content}</p>
            {m.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {m.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs h-4 px-1.5">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {safeFormat(m.updated_at, "MMM d, yyyy")}
            </p>
          </Card>
        ))}
      </div>

      {display.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-sm">
            {searchResults ? "No results found." : "No memories yet. Add one to get started."}
          </p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Memory" : "Add Memory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Memory content..."
              rows={4}
            />
            <Select value={formOrigin} onValueChange={(v) => setFormOrigin(v as MemoryOrigin)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGINS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {originIcons[o]} {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="Tags (comma-separated)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formContent.trim() || isLoading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
