import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookOpenIcon, PlusIcon, Trash2Icon, EditIcon, Loader2Icon } from "lucide-react";
import { useKnowledgeBase, useCreateKBEntry, useDeleteKBEntry, useUpdateKBEntry } from "@/hooks/use-knowledge-base";

const categories = ["general", "tone", "product", "process", "templates"];

export function KnowledgeBaseManager() {
  const { data: entries = [], isLoading } = useKnowledgeBase();
  const createEntry = useCreateKBEntry();
  const deleteEntry = useDeleteKBEntry();
  const updateEntry = useUpdateKBEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    if (editingId) {
      updateEntry.mutate({ id: editingId, title, content, category }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      createEntry.mutate({ title, content, category }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const resetForm = () => { setTitle(""); setContent(""); setCategory("general"); setEditingId(null); };

  const openEdit = (entry: any) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setDialogOpen(true);
  };

  const categoryColors: Record<string, string> = {
    general: "bg-muted text-muted-foreground",
    tone: "bg-primary/10 text-primary",
    product: "bg-emerald-500/10 text-emerald-700",
    process: "bg-amber-500/10 text-amber-700",
    templates: "bg-blue-500/10 text-blue-700",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpenIcon className="h-4 w-4 text-primary" />
            Knowledge Base
          </CardTitle>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <PlusIcon className="h-3 w-3" /> Add Entry
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">AI uses this context for all email drafts and replies</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-4"><Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
        {entries.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">No entries yet. Add company info, tone guides, or product details.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <Badge variant="secondary" className={`text-[10px] ${categoryColors[entry.category] || ""}`}>
                  {entry.category}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(entry)}>
                  <EditIcon className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteEntry.mutate(entry.id)}>
                  <Trash2Icon className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
          </div>
        ))}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Entry" : "Add Knowledge Base Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title (e.g., Brand Voice Guide)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Content the AI should know about..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending}>
              {(createEntry.isPending || updateEntry.isPending) && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
