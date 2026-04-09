import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain, Globe, Lock, Users, Archive, ArrowRight, Loader2, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const AGENTS = [
  { value: "global", label: "Global", icon: Globe },
  { value: "claude", label: "Claude", icon: Brain },
  { value: "chatgpt", label: "ChatGPT", icon: Brain },
  { value: "gemini", label: "Gemini", icon: Brain },
] as const;

type AgentTab = (typeof AGENTS)[number]["value"];

const VISIBILITY_CYCLE = ["private", "shared", "global"] as const;
type Visibility = (typeof VISIBILITY_CYCLE)[number];

const visibilityMeta: Record<Visibility, { icon: typeof Lock; label: string; cls: string }> = {
  private: { icon: Lock, label: "Private", cls: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40 hover:bg-zinc-500/30" },
  shared: { icon: Users, label: "Shared", cls: "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30" },
  global: { icon: Globe, label: "Global", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30" },
};

const agentColors: Record<string, string> = {
  claude: "bg-amber-500/20 text-amber-400",
  chatgpt: "bg-emerald-500/20 text-emerald-400",
  gemini: "bg-blue-500/20 text-blue-400",
  global: "bg-purple-500/20 text-purple-400",
};

function confidenceColor(c: number) {
  if (c >= 0.8) return "bg-emerald-500";
  if (c >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

const q = (table: string) => (supabase as any).from(table);

interface Memory {
  id: string;
  content: string;
  confidence_score: number;
  agent_id: string;
  visibility: Visibility;
  status: string;
  tags: string[] | null;
  created_at: string;
}

export default function MemoryScopingPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("agent") || "global") as AgentTab;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const setTab = (tab: AgentTab) => {
    setSearchParams({ agent: tab });
    setSelected(new Set());
  };

  // ─── Queries ──────────────────────────────────────────────────────────
  const memoriesKey = ["memory-scoping", workspaceId, activeTab];

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: memoriesKey,
    enabled: !!workspaceId,
    queryFn: async () => {
      let query = q("assistant_memory")
        .select("id, content, confidence_score, agent_id, visibility, status, tags, created_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (activeTab === "global") {
        query = query.eq("visibility", "global");
      } else {
        query = query.or(`agent_id.eq.${activeTab},visibility.eq.global`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: counts = [] } = useQuery<{ agent_id: string; count: number }[]>({
    queryKey: ["memory-counts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await q("assistant_memory")
        .select("agent_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        map[r.agent_id] = (map[r.agent_id] || 0) + 1;
      });
      return Object.entries(map).map(([agent_id, count]) => ({ agent_id, count }));
    },
  });

  const { data: globalCount = 0 } = useQuery<number>({
    queryKey: ["memory-global-count", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count, error } = await q("assistant_memory")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("visibility", "global")
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["memory-scoping"] });
    queryClient.invalidateQueries({ queryKey: ["memory-counts"] });
    queryClient.invalidateQueries({ queryKey: ["memory-global-count"] });
  };

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: Visibility }) => {
      const nextIdx = (VISIBILITY_CYCLE.indexOf(current) + 1) % VISIBILITY_CYCLE.length;
      const next = VISIBILITY_CYCLE[nextIdx];
      const { error } = await q("assistant_memory").update({ visibility: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onMutate: async ({ id, current }) => {
      await queryClient.cancelQueries({ queryKey: memoriesKey });
      const prev = queryClient.getQueryData<Memory[]>(memoriesKey);
      const nextIdx = (VISIBILITY_CYCLE.indexOf(current) + 1) % VISIBILITY_CYCLE.length;
      queryClient.setQueryData<Memory[]>(memoriesKey, (old) =>
        (old || []).map((m) => (m.id === id ? { ...m, visibility: VISIBILITY_CYCLE[nextIdx] } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(memoriesKey, ctx.prev);
      toast.error("Failed to update visibility");
    },
    onSettled: invalidateAll,
  });

  const bulkUpdate = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const ids = Array.from(selected);
      const { error } = await q("assistant_memory").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Updated ${selected.size} memories`);
      setSelected(new Set());
      invalidateAll();
    },
    onError: () => toast.error("Bulk update failed"),
  });

  // ─── Selection ────────────────────────────────────────────────────────
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (selected.size === memories.length) setSelected(new Set());
    else setSelected(new Set(memories.map((m) => m.id)));
  };

  const countMap = useMemo(() => {
    const m: Record<string, number> = {};
    counts.forEach((c) => (m[c.agent_id] = c.count));
    return m;
  }, [counts]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur px-4 md:px-8 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Memory Scoping</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {AGENTS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.value}
                onClick={() => setTab(a.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === a.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border/50 p-4 space-y-3 hidden lg:block">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Agent Counts</p>
          {AGENTS.filter((a) => a.value !== "global").map((a) => (
            <Card key={a.value} className="border-border/30 bg-card/40">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium">{a.label}</span>
                <Badge variant="secondary" className="text-xs">{countMap[a.value] || 0}</Badge>
              </CardContent>
            </Card>
          ))}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Global
              </span>
              <Badge variant="secondary" className="text-xs">{globalCount}</Badge>
            </CardContent>
          </Card>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Bulk toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selected.size} selected</span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdate.mutate({ visibility: "global" })}
                disabled={bulkUpdate.isPending}
                className="gap-1.5"
              >
                <Globe className="h-3.5 w-3.5" /> Share to Global
              </Button>
              <Select onValueChange={(v) => bulkUpdate.mutate({ agent_id: v })}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Move to agent" />
                </SelectTrigger>
                <SelectContent>
                  {AGENTS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkUpdate.mutate({ status: "archived" })}
                disabled={bulkUpdate.isPending}
                className="gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </Button>
            </div>
          )}

          {/* Select all */}
          {memories.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{memories.length} memories</p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === memories.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border/20 bg-card/30 animate-pulse h-36" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No memories found for this scope.</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {memories.map((m) => {
                const vis = visibilityMeta[m.visibility] || visibilityMeta.private;
                const VisIcon = vis.icon;
                return (
                  <Card
                    key={m.id}
                    className={cn(
                      "border-border/30 bg-card/40 transition-all",
                      selected.has(m.id) && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selected.has(m.id)}
                          onCheckedChange={() => toggle(m.id)}
                          className="mt-0.5"
                        />
                        <p className="text-sm font-mono leading-relaxed line-clamp-2 flex-1">
                          {m.content}
                        </p>
                      </div>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", confidenceColor(m.confidence_score))}
                            style={{ width: `${Math.round((m.confidence_score || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                          {Math.round((m.confidence_score || 0) * 100)}%
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", agentColors[m.agent_id] || agentColors.global)}>
                          {m.agent_id}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVisibility.mutate({ id: m.id, current: m.visibility });
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                            vis.cls
                          )}
                        >
                          <VisIcon className="h-3 w-3" />
                          {vis.label}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
