import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Search, Pin, PinOff, Trash2, Pencil, LayoutGrid, TableIcon,
  Star, Eye, Clock, Shield, AlertTriangle, Filter, X, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";

const query = (table: string) => (supabase as any).from(table);

type MemoryType = "semantic" | "episodic" | "preference" | "procedural" | "contextual";
type ReviewStatus = "approved" | "pending" | "stale" | "rejected";
type SourceType = "conversation" | "manual" | "agent" | "import" | "system";

interface MemoryRow {
  id: string;
  content: string;
  memory_type: MemoryType | null;
  confidence_score: number | null;
  importance_score: number | null;
  source_type: SourceType | null;
  origin: string;
  tags: string[] | null;
  entity_type: string | null;
  entity_id: string | null;
  review_status: string | null;
  is_pinned: boolean | null;
  access_count: number | null;
  last_accessed_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  decay_rate: number | null;
  related_memory_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  semantic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  episodic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  preference: "bg-green-500/20 text-green-400 border-green-500/30",
  procedural: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  contextual: "bg-muted text-muted-foreground border-border",
};

function confidenceColor(v: number) {
  if (v < 0.5) return "bg-red-500";
  if (v < 0.8) return "bg-yellow-500";
  return "bg-green-500";
}

function importanceStars(v: number) {
  const stars = Math.max(1, Math.min(5, Math.round(v * 5)));
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-3 w-3 ${i < stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
  ));
}

export default function MemoryDashboardPage() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  // Filters
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<MemoryType[]>([]);
  const [statusFilters, setStatusFilters] = useState<ReviewStatus[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Detail drawer
  const [selectedMemory, setSelectedMemory] = useState<MemoryRow | null>(null);
  const [editingMemory, setEditingMemory] = useState<MemoryRow | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // Fetch memories
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memory-dashboard", workspaceId, typeFilters, statusFilters, sourceFilter, entityFilter, pinnedOnly, sortBy, debouncedSearch],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Text search via RPC
      if (debouncedSearch.trim()) {
        const { data } = await (supabase as any).rpc("hybrid_memory_search", {
          query_embedding: "",
          query_text: debouncedSearch,
          ws_id: workspaceId,
          origin_filter: "any",
          match_count: 100,
        });
        if (!data) return [];
        // Fetch full rows for matched IDs
        const ids = data.map((r: any) => r.id);
        if (ids.length === 0) return [];
        const { data: full } = await query("assistant_memory")
          .select("*")
          .in("id", ids)
          .eq("workspace_id", workspaceId);
        return (full as MemoryRow[]) || [];
      }

      let q = query("assistant_memory")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (typeFilters.length > 0) q = q.in("memory_type", typeFilters);
      if (statusFilters.length > 0) q = q.in("review_status", statusFilters);
      if (sourceFilter !== "all") q = q.eq("source_type", sourceFilter);
      if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);
      if (pinnedOnly) q = q.eq("is_pinned", true);

      const sortMap: Record<string, string> = {
        importance: "importance_score",
        confidence: "confidence_score",
        last_accessed: "last_accessed_at",
        created_at: "created_at",
        access_count: "access_count",
      };
      q = q.order(sortMap[sortBy] || "created_at", { ascending: false, nullsFirst: false }).limit(200);

      const { data } = await q;
      return (data as MemoryRow[]) || [];
    },
    enabled: !!workspaceId,
  });

  // Stats
  const stats = useMemo(() => {
    const all = memories;
    return {
      total: all.length,
      pending: all.filter(m => m.review_status === "pending").length,
      stale: all.filter(m => m.review_status === "stale").length,
      pinned: all.filter(m => m.is_pinned).length,
      avgConfidence: all.length ? (all.reduce((s, m) => s + (m.confidence_score ?? 1), 0) / all.length) : 0,
    };
  }, [memories]);

  // Mutations
  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      await query("assistant_memory").update({ is_pinned: pinned }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memory-dashboard"] }); toast.success("Updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await query("assistant_memory").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-dashboard"] });
      setSelectedMemory(null);
      toast.success("Memory deleted");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (mem: Partial<MemoryRow> & { id: string }) => {
      const { id, ...rest } = mem;
      await query("assistant_memory").update(rest).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-dashboard"] });
      setEditingMemory(null);
      setSelectedMemory(null);
      toast.success("Memory updated");
    },
  });

  // Access log query
  const { data: accessLog = [] } = useQuery({
    queryKey: ["memory-access-log", selectedMemory?.id],
    queryFn: async () => {
      if (!selectedMemory) return [];
      const { data } = await query("memory_access_log")
        .select("*")
        .eq("memory_id", selectedMemory.id)
        .order("accessed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!selectedMemory,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selectedMemory) return;
      if (e.key === "e" || e.key === "E") { setEditingMemory(selectedMemory); }
      if (e.key === "p" || e.key === "P") { pinMutation.mutate({ id: selectedMemory.id, pinned: !selectedMemory.is_pinned }); }
      if (e.key === "d" || e.key === "D") { deleteMutation.mutate(selectedMemory.id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedMemory]);

  const toggleType = (t: MemoryType) => {
    setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleStatus = (s: ReviewStatus) => {
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Stats Header */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Memory Manager</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatBadge label="Total" value={stats.total} />
          <StatBadge label="Pending" value={stats.pending} onClick={() => setStatusFilters(["pending"])} className="cursor-pointer hover:ring-1 ring-yellow-500" />
          <StatBadge label="Stale" value={stats.stale} onClick={() => setStatusFilters(["stale"])} className="cursor-pointer hover:ring-1 ring-red-500" />
          <StatBadge label="Pinned" value={stats.pinned} icon={<Pin className="h-3 w-3" />} />
          <StatBadge label="Avg Confidence" value={`${(stats.avgConfidence * 100).toFixed(0)}%`} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <aside className="w-64 border-r border-border p-4 space-y-4 overflow-y-auto hidden lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search memories..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>

          <FilterSection title="Memory Type">
            {(["semantic", "episodic", "preference", "procedural", "contextual"] as MemoryType[]).map(t => (
              <Badge key={t} variant="outline" className={`cursor-pointer text-xs ${typeFilters.includes(t) ? TYPE_COLORS[t] : "opacity-50"}`} onClick={() => toggleType(t)}>
                {t}
              </Badge>
            ))}
          </FilterSection>

          <FilterSection title="Review Status">
            {(["approved", "pending", "stale", "rejected"] as ReviewStatus[]).map(s => (
              <Badge key={s} variant="outline" className={`cursor-pointer text-xs ${statusFilters.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "opacity-50"}`} onClick={() => toggleStatus(s)}>
                {s}
              </Badge>
            ))}
          </FilterSection>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="deal">Deal</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={pinnedOnly} onCheckedChange={setPinnedOnly} id="pinned" />
            <Label htmlFor="pinned" className="text-xs">Pinned Only</Label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="importance">Importance</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="last_accessed">Last Accessed</SelectItem>
                <SelectItem value="access_count">Access Count</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground pt-2">{memories.length} results</div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}>
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Brain className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No memories found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {memories.map(m => (
                <MemoryCard key={m.id} memory={m} onClick={() => setSelectedMemory(m)} onPin={() => pinMutation.mutate({ id: m.id, pinned: !m.is_pinned })} onDelete={() => deleteMutation.mutate(m.id)} onEdit={() => { setSelectedMemory(m); setEditingMemory(m); }} />
              ))}
            </div>
          ) : (
            <MemoryTable memories={memories} onSelect={setSelectedMemory} onPin={(m) => pinMutation.mutate({ id: m.id, pinned: !m.is_pinned })} onDelete={(m) => deleteMutation.mutate(m.id)} />
          )}
        </main>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selectedMemory && !editingMemory} onOpenChange={(open) => { if (!open) setSelectedMemory(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMemory && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedMemory.is_pinned && <Pin className="h-4 w-4 text-yellow-400" />}
                  <Badge variant="outline" className={TYPE_COLORS[selectedMemory.memory_type || "contextual"]}>
                    {selectedMemory.memory_type || "unknown"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{selectedMemory.review_status}</Badge>
                </SheetTitle>
              </SheetHeader>

              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedMemory.content}</p>

              <div className="space-y-3 text-xs">
                <MetaRow label="Confidence" value={
                  <div className="flex items-center gap-2 flex-1">
                    <Progress value={(selectedMemory.confidence_score ?? 1) * 100} className={`h-2 flex-1 [&>div]:${confidenceColor(selectedMemory.confidence_score ?? 1)}`} />
                    <span>{((selectedMemory.confidence_score ?? 1) * 100).toFixed(0)}%</span>
                  </div>
                } />
                <MetaRow label="Importance" value={<div className="flex">{importanceStars(selectedMemory.importance_score ?? 0.5)}</div>} />
                <MetaRow label="Source" value={selectedMemory.source_type || selectedMemory.origin} />
                <MetaRow label="Entity" value={selectedMemory.entity_type ? `${selectedMemory.entity_type}${selectedMemory.entity_id ? ` (${selectedMemory.entity_id.slice(0, 8)}...)` : ""}` : "Global"} />
                <MetaRow label="Tags" value={selectedMemory.tags?.length ? <div className="flex flex-wrap gap-1">{selectedMemory.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div> : "None"} />
                <MetaRow label="Access Count" value={selectedMemory.access_count ?? 0} />
                <MetaRow label="Last Accessed" value={selectedMemory.last_accessed_at ? formatDistanceToNow(new Date(selectedMemory.last_accessed_at), { addSuffix: true }) : "Never"} />
                <MetaRow label="Valid Until" value={selectedMemory.valid_until ? format(new Date(selectedMemory.valid_until), "PPp") : "Indefinite"} />
                <MetaRow label="Decay Rate" value={selectedMemory.decay_rate ?? 0} />
                <MetaRow label="Created" value={format(new Date(selectedMemory.created_at), "PPp")} />
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingMemory(selectedMemory)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => pinMutation.mutate({ id: selectedMemory.id, pinned: !selectedMemory.is_pinned })}>
                  {selectedMemory.is_pinned ? <PinOff className="h-3 w-3 mr-1" /> : <Pin className="h-3 w-3 mr-1" />}
                  {selectedMemory.is_pinned ? "Unpin" : "Pin"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(selectedMemory.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
              </div>

              {/* Access Log */}
              {accessLog.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Access History</h4>
                  <div className="space-y-1.5">
                    {accessLog.map((log: any) => (
                      <div key={log.id} className="text-xs bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(log.accessed_at), { addSuffix: true })}</span>
                        <span className="mx-1">·</span>
                        <span>{log.accessed_by}</span>
                        {log.query_context && <p className="text-muted-foreground mt-0.5 truncate">{log.query_context}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Memories */}
              {selectedMemory.related_memory_ids && selectedMemory.related_memory_ids.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Related Memories</h4>
                  <div className="text-xs text-muted-foreground">
                    {selectedMemory.related_memory_ids.map(rid => (
                      <Badge key={rid} variant="outline" className="text-xs mr-1 mb-1">{rid.slice(0, 8)}...</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Drawer */}
      <Sheet open={!!editingMemory} onOpenChange={(open) => { if (!open) setEditingMemory(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {editingMemory && (
            <EditMemoryForm
              memory={editingMemory}
              onSave={(updates) => updateMutation.mutate({ id: editingMemory.id, ...updates })}
              onCancel={() => setEditingMemory(null)}
              isSaving={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- Sub-components ---

function StatBadge({ label, value, icon, onClick, className }: { label: string; value: string | number; icon?: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div onClick={onClick} className={`bg-muted/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm ${className || ""}`}>
      {icon}
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{title}</Label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1">{value}</div>
    </div>
  );
}

function MemoryCard({ memory: m, onClick, onPin, onDelete, onEdit }: { memory: MemoryRow; onClick: () => void; onPin: () => void; onDelete: () => void; onEdit: () => void }) {
  const truncated = m.content.length > 150;
  return (
    <Card className="p-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group relative" onClick={onClick}>
      {m.is_pinned && <Pin className="absolute top-2 right-2 h-3 w-3 text-yellow-400" />}
      <div className="flex items-center gap-1.5 mb-2">
        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[m.memory_type || "contextual"]}`}>{m.memory_type || "—"}</Badge>
        <Badge variant="outline" className="text-xs">{m.review_status}</Badge>
        {m.source_type && <Badge variant="secondary" className="text-xs">{m.source_type}</Badge>}
      </div>
      <p className="text-sm text-foreground mb-2 line-clamp-3">{m.content}</p>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${confidenceColor(m.confidence_score ?? 1)}`} style={{ width: `${(m.confidence_score ?? 1) * 100}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{((m.confidence_score ?? 1) * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-1 mb-2">{importanceStars(m.importance_score ?? 0.5)}</div>
      {m.tags && m.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {m.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs py-0">{t}</Badge>)}
          {m.tags.length > 3 && <span className="text-xs text-muted-foreground">+{m.tags.length - 3}</span>}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{m.access_count ?? 0}</span>
        <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
      </div>
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity" onClick={e => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onPin}>{m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}</Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </Card>
  );
}

function MemoryTable({ memories, onSelect, onPin, onDelete }: { memories: MemoryRow[]; onSelect: (m: MemoryRow) => void; onPin: (m: MemoryRow) => void; onDelete: (m: MemoryRow) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Content</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Access</TableHead>
          <TableHead>Created</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {memories.map(m => (
          <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(m)}>
            <TableCell>{m.is_pinned && <Pin className="h-3 w-3 text-yellow-400" />}</TableCell>
            <TableCell className="max-w-xs truncate text-sm">{m.content}</TableCell>
            <TableCell><Badge variant="outline" className={`text-xs ${TYPE_COLORS[m.memory_type || "contextual"]}`}>{m.memory_type}</Badge></TableCell>
            <TableCell><Badge variant="outline" className="text-xs">{m.review_status}</Badge></TableCell>
            <TableCell><span className="text-xs">{((m.confidence_score ?? 1) * 100).toFixed(0)}%</span></TableCell>
            <TableCell><span className="text-xs">{m.access_count ?? 0}</span></TableCell>
            <TableCell><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span></TableCell>
            <TableCell onClick={e => e.stopPropagation()}>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onPin(m)}>{m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}</Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(m)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditMemoryForm({ memory, onSave, onCancel, isSaving }: { memory: MemoryRow; onSave: (u: Partial<MemoryRow>) => void; onCancel: () => void; isSaving: boolean }) {
  const [content, setContent] = useState(memory.content);
  const [memoryType, setMemoryType] = useState<string>(memory.memory_type || "semantic");
  const [importance, setImportance] = useState(String(memory.importance_score ?? 0.5));
  const [confidence, setConfidence] = useState(String(memory.confidence_score ?? 1));
  const [reviewStatus, setReviewStatus] = useState(memory.review_status || "approved");
  const [tagsStr, setTagsStr] = useState((memory.tags || []).join(", "));

  return (
    <div className="space-y-4 pt-2">
      <SheetHeader><SheetTitle>Edit Memory</SheetTitle></SheetHeader>
      <div className="space-y-3">
        <div><Label className="text-xs">Content</Label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} /></div>
        <div><Label className="text-xs">Memory Type</Label>
          <Select value={memoryType} onValueChange={setMemoryType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["semantic", "episodic", "preference", "procedural", "contextual"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Importance (0-1)</Label><Input type="number" step="0.1" min="0" max="1" value={importance} onChange={e => setImportance(e.target.value)} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Confidence (0-1)</Label><Input type="number" step="0.1" min="0" max="1" value={confidence} onChange={e => setConfidence(e.target.value)} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Review Status</Label>
          <Select value={reviewStatus} onValueChange={setReviewStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["approved", "pending", "stale", "rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Tags (comma-separated)</Label><Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} className="h-8 text-xs" /></div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={isSaving} onClick={() => onSave({
          content,
          memory_type: memoryType as MemoryType,
          importance_score: parseFloat(importance),
          confidence_score: parseFloat(confidence),
          review_status: reviewStatus,
          tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
        })}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
