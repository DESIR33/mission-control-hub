import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Grid3X3, ScatterChart as ScatterIcon, RefreshCw, Search, X, ChevronRight,
  Brain, SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ClusterMember {
  memory_id: string;
  content: string;
  confidence: number;
  agent_id: string;
  created_at: string;
  x: number;
  y: number;
}

interface Cluster {
  id: string;
  label: string;
  color: string;
  members: ClusterMember[];
}

const AGENTS = ["claude", "chatgpt", "gemini", "global"];

function agentBadgeClass(a: string) {
  if (a?.toLowerCase().includes("claude")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (a?.toLowerCase().includes("chatgpt")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (a?.toLowerCase().includes("gemini")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function SemanticMemoryBrowserPage() {
  const { workspaceId } = useWorkspace();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"grid" | "scatter">("grid");
  const [k, setK] = useState(8);
  const [agentFilter, setAgentFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [drawerCluster, setDrawerCluster] = useState<Cluster | null>(null);
  const [sortBy, setSortBy] = useState<"confidence" | "date" | "agent">("confidence");

  const fetchClusters = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-cluster", {
        body: { workspace_id: workspaceId, k },
      });
      if (error) throw error;
      setClusters(data?.clusters || []);
    } catch (e: any) {
      toast.error("Cluster computation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, k]);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const filteredClusters = useMemo(() => {
    if (agentFilter.size === 0) return clusters;
    return clusters
      .map((c) => ({
        ...c,
        members: c.members.filter((m) =>
          agentFilter.has(m.agent_id?.toLowerCase())
        ),
      }))
      .filter((c) => c.members.length > 0);
  }, [clusters, agentFilter]);

  const allMembers = useMemo(
    () => filteredClusters.flatMap((c) => c.members.map((m) => ({ ...m, color: c.color, clusterId: c.id }))),
    [filteredClusters]
  );

  const searchLower = search.toLowerCase();
  const highlightedIds = useMemo(() => {
    if (!searchLower) return new Set<string>();
    return new Set(allMembers.filter((m) => m.content.toLowerCase().includes(searchLower)).map((m) => m.memory_id));
  }, [allMembers, searchLower]);

  const toggleAgent = (a: string) => {
    setAgentFilter((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  };

  const drawerMembers = useMemo(() => {
    if (!drawerCluster) return [];
    const ms = [...drawerCluster.members];
    if (sortBy === "confidence") ms.sort((a, b) => b.confidence - a.confidence);
    else if (sortBy === "date") ms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else ms.sort((a, b) => a.agent_id.localeCompare(b.agent_id));
    return ms;
  }, [drawerCluster, sortBy]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Semantic Browser</h1>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="grid" className="gap-1.5 text-xs">
              <Grid3X3 className="h-3.5 w-3.5" /> Clusters
            </TabsTrigger>
            <TabsTrigger value="scatter" className="gap-1.5 text-xs">
              <ScatterIcon className="h-3.5 w-3.5" /> Scatter
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">k={k}</span>
          <Slider
            value={[k]}
            onValueChange={([v]) => setK(v)}
            min={3}
            max={15}
            step={1}
            className="w-24"
          />
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={fetchClusters} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Recalculate
        </Button>
        <div className="flex gap-1">
          {AGENTS.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={agentFilter.has(a) ? "default" : "outline"}
              className="text-xs h-7 capitalize"
              onClick={() => toggleAgent(a)}
            >
              {a}
            </Button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Highlight memories…"
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && clusters.length === 0 && (
        <div className="text-center py-20">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No memories with embeddings found.</p>
        </div>
      )}

      {/* Cluster Grid */}
      {!loading && view === "grid" && filteredClusters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClusters.map((c) => {
            const avgConf = c.members.reduce((s, m) => s + m.confidence, 0) / c.members.length;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card
                  className="bg-card border-border/50 cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                  onClick={() => setDrawerCluster(c)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <CardTitle className="text-sm font-semibold text-foreground truncate">{c.label}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{c.members.length} memories</Badge>
                      <span className="text-[10px] text-muted-foreground">Avg conf: {(avgConf * 100).toFixed(0)}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 pb-4">
                    {c.members.slice(0, 3).map((m) => (
                      <p key={m.memory_id} className="text-xs font-mono text-muted-foreground truncate">
                        {m.content}
                      </p>
                    ))}
                    {c.members.length > 3 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        +{c.members.length - 3} more <ChevronRight className="h-3 w-3" />
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Scatter Plot */}
      {!loading && view === "scatter" && allMembers.length > 0 && (
        <ScatterPlot
          members={allMembers}
          highlightedIds={highlightedIds}
          onClickCluster={(clusterId) => {
            const c = filteredClusters.find((cl) => cl.id === clusterId);
            if (c) setDrawerCluster(c);
          }}
        />
      )}

      {/* Drawer */}
      <Sheet open={!!drawerCluster} onOpenChange={(o) => { if (!o) setDrawerCluster(null); }}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 border-border/50 bg-background">
          {drawerCluster && (
            <>
              <SheetHeader className="p-5 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: drawerCluster.color }} />
                  <SheetTitle className="text-base">{drawerCluster.label}</SheetTitle>
                </div>
                <p className="text-xs text-muted-foreground">{drawerCluster.members.length} memories in cluster</p>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-7 w-36 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">By Confidence</SelectItem>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="agent">By Agent</SelectItem>
                  </SelectContent>
                </Select>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-160px)]">
                <div className="p-4 space-y-3">
                  {drawerMembers.map((m) => (
                    <div key={m.memory_id} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                      <p className="text-sm font-mono text-foreground leading-relaxed">{m.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${m.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{(m.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${agentBadgeClass(m.agent_id)}`}>{m.agent_id}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---- Canvas-based scatter plot ----
function ScatterPlot({
  members,
  highlightedIds,
  onClickCluster,
}: {
  members: (ClusterMember & { color: string; clusterId: string })[];
  highlightedIds: Set<string>;
  onClickCluster: (clusterId: string) => void;
}) {
  type Member = ClusterMember & { color: string; clusterId: string };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; m: Member } | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.min(width * 0.6, 560) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const pad = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, dims.w, dims.h);

    // Draw grid
    ctx.strokeStyle = "hsl(0,0%,12%)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const px = pad + (i / 4) * (dims.w - pad * 2);
      ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, dims.h - pad); ctx.stroke();
      const py = pad + (i / 4) * (dims.h - pad * 2);
      ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(dims.w - pad, py); ctx.stroke();
    }

    // Draw dots
    for (const m of members) {
      const cx = pad + m.x * (dims.w - pad * 2);
      const cy = pad + (1 - m.y) * (dims.h - pad * 2);
      const r = 4 + m.confidence * 8;
      const isHL = highlightedIds.size > 0 && highlightedIds.has(m.memory_id);
      const dim = highlightedIds.size > 0 && !isHL;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.globalAlpha = dim ? 0.15 : 0.85;
      ctx.fillStyle = m.color;
      ctx.fill();
      if (isHL) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }, [members, dims, highlightedIds]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: typeof members[0] | null = null;
      let closestDist = 20;
      for (const m of members) {
        const cx = pad + m.x * (dims.w - pad * 2);
        const cy = pad + (1 - m.y) * (dims.h - pad * 2);
        const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        if (d < closestDist) { closestDist = d; closest = m; }
      }
      if (closest) {
        setTooltip({ x: mx, y: my, m: closest });
      } else {
        setTooltip(null);
      }
    },
    [members, dims]
  );

  const handleClick = useCallback(() => {
    if (tooltip) onClickCluster(tooltip.m.clusterId);
  }, [tooltip, onClickCluster]);

  return (
    <div ref={containerRef} className="relative w-full rounded-lg border border-border/50 bg-card overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h }}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
      />
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-20 bg-popover border border-border rounded-lg p-2.5 shadow-lg max-w-[240px]"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <p className="text-xs font-mono text-foreground line-clamp-3">{tooltip.m.content}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className={`text-[9px] ${agentBadgeClass(tooltip.m.agent_id)}`}>
                {tooltip.m.agent_id}
              </Badge>
              <span className="text-[9px] text-muted-foreground">{(tooltip.m.confidence * 100).toFixed(0)}% conf</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
