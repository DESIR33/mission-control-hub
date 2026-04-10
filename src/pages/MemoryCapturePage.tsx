import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Brain, Pin, PinOff, Trash2, Pencil, Check, X, ChevronDown, ChevronUp,
  Loader2, Sparkles, Search, Filter, ArrowLeft, AlertTriangle
} from "lucide-react";
import ConflictResolutionPanel from "@/components/memory/ConflictResolutionPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";

const MEMORY_TYPES = ["semantic", "episodic", "preference", "procedural", "contextual"] as const;
const IMPORTANCE_LABELS = ["Low", "Medium", "High", "Critical"];
const ENTITY_TYPES = ["contact", "company", "deal", "video", "subscriber", "global"] as const;

const typeColors: Record<string, string> = {
  semantic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  episodic: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  preference: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  procedural: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  contextual: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const q = (table: string) => (supabase as any).from(table);

// ─── Hook ────────────────────────────────────────────────────────────────────
function useMemoryCapture(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = ["memory-capture", workspaceId];

  const pending = useQuery({
    queryKey: [...key, "pending"],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await q("assistant_memory")
        .select("id, content, memory_type, source_type, confidence_score, importance_score, tags, is_pinned, created_at, review_status")
        .eq("workspace_id", workspaceId)
        .eq("review_status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const recent = useQuery({
    queryKey: [...key, "recent"],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await q("assistant_memory")
        .select("id, content, memory_type, source_type, confidence_score, importance_score, tags, is_pinned, entity_type, entity_id, valid_until, created_at, review_status")
        .eq("workspace_id", workspaceId)
        .eq("review_status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const existingTags = useQuery({
    queryKey: [...key, "tags"],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await q("assistant_memory")
        .select("tags")
        .eq("workspace_id", workspaceId)
        .not("tags", "eq", "{}");
      const tagSet = new Set<string>();
      (data || []).forEach((r: any) => (r.tags || []).forEach((t: string) => tagSet.add(t)));
      return Array.from(tagSet).sort();
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: key });
  };

  return { pending, recent, existingTags, invalidateAll };
}

// ─── Quick Capture Form ──────────────────────────────────────────────────────
function QuickCaptureForm({ workspaceId, existingTags, onCreated }: {
  workspaceId: string;
  existingTags: string[];
  onCreated: () => void;
}) {
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState<string>("semantic");
  const [importance, setImportance] = useState([50]);
  const [entityType, setEntityType] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const importanceVal = importance[0] / 100;
  const importanceLabel = IMPORTANCE_LABELS[Math.min(Math.floor(importanceVal * 4), 3)];

  const filteredTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    return existingTags.filter(t =>
      t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
    ).slice(0, 5);
  }, [tagInput, existingTags, tags]);

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return toast.error("Memory content is required");
    setSubmitting(true);
    try {
      await supabase.functions.invoke("assistant-memory-manage", {
        body: {
          action: "create",
          workspace_id: workspaceId,
          content: content.trim(),
          origin: "manual",
          tags,
          memory_type: memoryType,
          importance_score: importanceVal,
          entity_type: entityType || null,
          valid_until: validUntil?.toISOString() || null,
          is_pinned: isPinned,
          review_status: "approved",
          source_type: "manual",
        },
      });
      toast.success("Memory captured successfully");
      setContent("");
      setTags([]);
      setTagInput("");
      setImportance([50]);
      setEntityType("");
      setValidUntil(undefined);
      setIsPinned(false);
      onCreated();
    } catch {
      toast.error("Failed to save memory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What should the AI remember?"
          className="min-h-[100px] bg-background/50 resize-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Memory Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Memory Type</Label>
            <Select value={memoryType} onValueChange={setMemoryType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMORY_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importance */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Importance: <span className="text-foreground">{importanceLabel}</span>
            </Label>
            <Slider value={importance} onValueChange={setImportance} max={100} step={1} className="mt-2" />
          </div>

          {/* Entity Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Link (optional)</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {ENTITY_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valid Until */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Expires</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {validUntil ? format(validUntil, "PPP") : "Never"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5 relative">
          <Label className="text-xs text-muted-foreground">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map(t => (
              <Badge key={t} variant="secondary" className="text-xs gap-1">
                {t}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))} />
              </Badge>
            ))}
          </div>
          <Input
            value={tagInput}
            onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
            onFocus={() => setShowTagSuggestions(true)}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
            placeholder="Add tags (Enter to add)"
            className="h-8"
          />
          {showTagSuggestions && filteredTagSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
              {filteredTagSuggestions.map(s => (
                <button key={s} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent" onMouseDown={() => addTag(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Switch checked={isPinned} onCheckedChange={setIsPinned} id="pin-toggle" />
            <Label htmlFor="pin-toggle" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5" /> Pin this memory
            </Label>
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !content.trim()} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Save Memory
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pending Review Queue ────────────────────────────────────────────────────
function PendingReviewQueue({ items, isLoading, onAction }: {
  items: any[];
  isLoading: boolean;
  onAction: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(m => m.content?.toLowerCase().includes(lower));
  }, [items, searchTerm]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(m => m.id)));
  };

  const handleAction = async (ids: string[], status: string) => {
    setProcessing(true);
    try {
      for (const id of ids) {
        await q("assistant_memory").update({ review_status: status, updated_at: new Date().toISOString() } as any).eq("id", id);
      }
      toast.success(`${ids.length} memor${ids.length > 1 ? "ies" : "y"} ${status}`);
      setSelected(new Set());
      onAction();
    } catch {
      toast.error("Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;
    setProcessing(true);
    try {
      await q("assistant_memory").update({ content: editContent, review_status: "approved", updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success("Memory updated & approved");
      setEditingId(null);
      onAction();
    } catch {
      toast.error("Update failed");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Pending Review
            {items.length > 0 && <Badge variant="secondary" className="text-xs">{items.length}</Badge>}
          </CardTitle>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-emerald-400" onClick={() => handleAction(Array.from(selected), "approved")} disabled={processing}>
                <Check className="h-3.5 w-3.5" /> Approve ({selected.size})
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-red-400" onClick={() => handleAction(Array.from(selected), "rejected")} disabled={processing}>
                <X className="h-3.5 w-3.5" /> Reject ({selected.size})
              </Button>
            </div>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter pending memories..."
            className="pl-8 h-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pending memories to review</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/30">
              <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
            {filtered.map(m => (
              <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-md border border-border/30 hover:border-border/60 transition-colors">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleSelect(m.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  {editingId === m.id ? (
                    <div className="space-y-2">
                      <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[60px] text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(m.id)} disabled={processing}>Save & Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground line-clamp-2">{m.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-[10px] border", typeColors[m.memory_type] || "bg-muted text-muted-foreground")}>{m.memory_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{m.source_type}</span>
                        <span className="text-[10px] text-muted-foreground">conf: {(m.confidence_score * 100).toFixed(0)}%</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
                      </div>
                    </>
                  )}
                </div>
                {editingId !== m.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => handleAction([m.id], "approved")} disabled={processing}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(m.id); setEditContent(m.content); }} disabled={processing}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleAction([m.id], "rejected")} disabled={processing}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent Memories Feed ────────────────────────────────────────────────────
function RecentMemoriesFeed({ items, isLoading, onAction }: {
  items: any[];
  isLoading: boolean;
  onAction: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handlePin = async (id: string, pinned: boolean) => {
    setProcessing(id);
    try {
      await q("assistant_memory").update({ is_pinned: !pinned, updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success(pinned ? "Memory unpinned" : "Memory pinned");
      onAction();
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    try {
      await q("assistant_memory").delete().eq("id", id);
      toast.success("Memory deleted");
      onAction();
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Memories</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No approved memories yet</p>
        ) : (
          <div className="space-y-2">
            {items.map(m => {
              const expanded = expandedId === m.id;
              return (
                <div key={m.id} className="p-3 rounded-md border border-border/30 hover:border-border/60 transition-colors">
                  <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(expanded ? null : m.id)}>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm text-foreground", !expanded && "line-clamp-2")}>{m.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={cn("text-[10px] border", typeColors[m.memory_type] || "bg-muted")}>{m.memory_type}</Badge>
                        {m.is_pinned && <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/30 text-amber-400"><Pin className="h-2.5 w-2.5" />Pinned</Badge>}
                        {(m.tags || []).slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(m.created_at), "MMM d")}</span>
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Confidence</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Progress value={(m.confidence_score || 0) * 100} className="h-1.5 flex-1" />
                            <span>{((m.confidence_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Importance</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Progress value={(m.importance_score || 0) * 100} className="h-1.5 flex-1" />
                            <span>{((m.importance_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        {m.entity_type && <div><span className="text-muted-foreground">Entity</span><p className="capitalize mt-0.5">{m.entity_type}</p></div>}
                        {m.valid_until && <div><span className="text-muted-foreground">Expires</span><p className="mt-0.5">{format(new Date(m.valid_until), "MMM d, yyyy")}</p></div>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); handlePin(m.id, m.is_pinned); }} disabled={processing === m.id}>
                          {m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          {m.is_pinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={e => { e.stopPropagation(); handleDelete(m.id); }} disabled={processing === m.id}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MemoryCapturePage() {
  const { workspaceId } = useWorkspace();
  const { pending, recent, existingTags, invalidateAll } = useMemoryCapture(workspaceId);

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Link to="/ai/memory">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Memory Capture
            </h1>
            <p className="text-sm text-muted-foreground">Create, review, and manage AI memories</p>
          </div>
        </div>
      </motion.div>

      {workspaceId && (
        <>
          <QuickCaptureForm
            workspaceId={workspaceId}
            existingTags={existingTags.data || []}
            onCreated={invalidateAll}
          />

          <ConflictResolutionPanel workspaceId={workspaceId} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PendingReviewQueue
              items={pending.data || []}
              isLoading={pending.isLoading}
              onAction={invalidateAll}
            />
            <RecentMemoriesFeed
              items={recent.data || []}
              isLoading={recent.isLoading}
              onAction={invalidateAll}
            />
          </div>
        </>
      )}
    </div>
  );
}
