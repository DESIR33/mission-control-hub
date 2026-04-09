import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Brain, Check, Pencil, Trash2, Clock, ArrowLeft, ChevronDown, ChevronUp,
  Loader2, PartyPopper, Settings2, Search, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const q = (table: string) => (supabase as any).from(table);

const typeColors: Record<string, string> = {
  semantic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  episodic: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  preference: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  procedural: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  contextual: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

function flagReason(m: any): string {
  if (m.valid_until && new Date(m.valid_until) < new Date()) return "Expired";
  if ((m.confidence_score || 1) < 0.4) return "Confidence decayed";
  if ((m.importance_score || 0.5) < 0.2) return "Unused";
  if (m.review_status === "pending") return "Pending review";
  return "Stale";
}

export default function MemoryReviewPage() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const baseKey = ["memory-review", workspaceId];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [decayRate, setDecayRate] = useState([1]);
  const [unusedThreshold, setUnusedThreshold] = useState([90]);
  const [episodicDays, setEpisodicDays] = useState([30]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [...baseKey, "queue"],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await q("assistant_memory")
        .select("id, content, memory_type, source_type, confidence_score, importance_score, tags, is_pinned, valid_until, access_count, last_accessed_at, decay_rate, created_at, review_status")
        .eq("workspace_id", workspaceId)
        .in("review_status", ["stale", "pending"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: lastProcessed } = useQuery({
    queryKey: [...baseKey, "last-run"],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await q("strategist_notifications")
        .select("created_at")
        .eq("workspace_id", workspaceId)
        .eq("title", "Memory Review Required")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0]?.created_at || null;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: baseKey });

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(m => m.content?.toLowerCase().includes(lower));
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    const stale = items.filter(m => m.review_status === "stale").length;
    const expired = items.filter(m => m.valid_until && new Date(m.valid_until) < new Date()).length;
    const avgConf = items.length > 0
      ? items.reduce((s, m) => s + (m.confidence_score || 0), 0) / items.length
      : 0;
    return { total: items.length, stale, expired, avgConf };
  }, [items]);

  // ── Actions ──
  const approve = async (ids: string[]) => {
    setProcessing(true);
    try {
      for (const id of ids) {
        await q("assistant_memory").update({
          review_status: "approved",
          confidence_score: 1.0,
          valid_until: null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", id);
      }
      toast.success(`${ids.length} memor${ids.length > 1 ? "ies" : "y"} approved`);
      setSelected(new Set());
      invalidate();
    } catch { toast.error("Failed"); }
    finally { setProcessing(false); }
  };

  const snooze = async (id: string) => {
    setProcessing(true);
    try {
      const future = new Date(Date.now() + 30 * 86400000).toISOString();
      await q("assistant_memory").update({
        review_status: "approved",
        valid_until: future,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success("Snoozed for 30 days");
      invalidate();
    } catch { toast.error("Failed"); }
    finally { setProcessing(false); }
  };

  const deleteMemory = async (ids: string[]) => {
    setProcessing(true);
    try {
      for (const id of ids) {
        await q("assistant_memory").delete().eq("id", id);
      }
      toast.success(`${ids.length} memor${ids.length > 1 ? "ies" : "y"} deleted`);
      setSelected(new Set());
      invalidate();
    } catch { toast.error("Failed"); }
    finally { setProcessing(false); }
  };

  const updateContent = async (id: string) => {
    if (!editContent.trim()) return;
    setProcessing(true);
    try {
      await supabase.functions.invoke("assistant-memory-manage", {
        body: {
          action: "update",
          workspace_id: workspaceId,
          id,
          content: editContent.trim(),
          origin: "manual",
        },
      });
      await q("assistant_memory").update({
        review_status: "approved",
        confidence_score: 1.0,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success("Memory updated & approved");
      setEditingId(null);
      invalidate();
    } catch { toast.error("Failed"); }
    finally { setProcessing(false); }
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const sel = Array.from(selected);
      if (sel.length === 0) return;
      switch (e.key.toLowerCase()) {
        case "a": e.preventDefault(); approve(sel); break;
        case "d": e.preventDefault(); deleteMemory(sel); break;
        case "s": e.preventDefault(); if (sel.length === 1) snooze(sel[0]); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(m => m.id)));
  };

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Link to="/ai/memory">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" /> Memory Review
            </h1>
            <p className="text-sm text-muted-foreground">Review stale, expired, and pending memories</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(!settingsOpen)}>
            <Settings2 className="h-3.5 w-3.5" /> Decay Settings
          </Button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Needs Review", value: stats.total, color: "text-amber-400" },
          { label: "Stale", value: stats.stale, color: "text-red-400" },
          { label: "Expired", value: stats.expired, color: "text-orange-400" },
          { label: "Avg Confidence", value: `${(stats.avgConf * 100).toFixed(0)}%`, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decay Settings */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleContent>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Decay Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Decay Rate: {(decayRate[0] / 100).toFixed(2)}</Label>
                <Slider value={decayRate} onValueChange={setDecayRate} max={10} step={1} />
                <p className="text-[10px] text-muted-foreground">0 = no decay, 0.05 = fast</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Episodic Memory Duration: {episodicDays[0]} days</Label>
                <Slider value={episodicDays} onValueChange={setEpisodicDays} min={7} max={180} step={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unused Threshold: {unusedThreshold[0]} days</Label>
                <Slider value={unusedThreshold} onValueChange={setUnusedThreshold} min={30} max={365} step={1} />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Queue */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter..." className="pl-8 h-8" />
            </div>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-emerald-400" onClick={() => approve(Array.from(selected))} disabled={processing}>
                  <Check className="h-3.5 w-3.5" /> Approve ({selected.size})
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-400" onClick={() => deleteMemory(Array.from(selected))} disabled={processing}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
                </Button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Keyboard: A = approve, D = delete, S = snooze selected</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <PartyPopper className="h-12 w-12 mx-auto text-amber-400" />
              <p className="text-lg font-semibold text-foreground">All clear!</p>
              <p className="text-sm text-muted-foreground">No memories need review right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                <span className="text-xs text-muted-foreground">Select all ({filtered.length})</span>
              </div>
              {filtered.map(m => (
                <div key={m.id} className={cn("p-3 rounded-md border transition-colors", selected.has(m.id) ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60")}>
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleSelect(m.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[60px] text-sm" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateContent(m.id)} disabled={processing}>Save & Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground">{m.content}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={cn("text-[10px] border", typeColors[m.memory_type] || "bg-muted")}>{m.memory_type}</Badge>
                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">{flagReason(m)}</Badge>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[10px] text-muted-foreground">{((m.confidence_score || 0) * 100).toFixed(0)}%</span>
                              <Progress value={(m.confidence_score || 0) * 100} className="h-1.5 w-16" />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d")}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== m.id && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" title="Approve (A)" onClick={() => approve([m.id])} disabled={processing}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit (U)" onClick={() => { setEditingId(m.id); setEditContent(m.content); }} disabled={processing}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400" title="Snooze 30d (S)" onClick={() => snooze(m.id)} disabled={processing}>
                          <Clock className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" title="Delete (D)" onClick={() => deleteMemory([m.id])} disabled={processing}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {lastProcessed && (
        <p className="text-xs text-muted-foreground text-center">
          Last decay run: {format(new Date(lastProcessed), "MMM d, yyyy 'at' HH:mm")}
        </p>
      )}
    </div>
  );
}
