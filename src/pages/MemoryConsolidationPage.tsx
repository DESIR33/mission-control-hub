import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain, Layers, ChevronDown, ChevronRight, Loader2, Merge, MousePointerClick,
  ShieldCheck, ArrowLeft, Sparkles, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { safeFormat } from "@/lib/date-utils";
import { Link } from "react-router-dom";

interface ClusterMember {
  id: string;
  content: string;
  confidence_score: number;
  agent_id: string;
  created_at: string;
}

interface Cluster {
  cluster_id: string;
  topic_label: string;
  avg_similarity: number;
  avg_confidence: number;
  members: ClusterMember[];
}

interface ClusterResponse {
  clusters: Cluster[];
  total_memories: number;
  duplicate_count: number;
  duplication_rate: number;
}

const agentColors: Record<string, string> = {
  claude: "bg-amber-500/20 text-amber-400",
  chatgpt: "bg-emerald-500/20 text-emerald-400",
  gemini: "bg-blue-500/20 text-blue-400",
  global: "bg-purple-500/20 text-purple-400",
};

function confidenceBarColor(c: number) {
  if (c >= 0.8) return "bg-emerald-500";
  if (c >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

export default function MemoryConsolidationPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [mergingCluster, setMergingCluster] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ClusterResponse>({
    queryKey: ["memory-clusters", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cluster-memories", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
  });

  const clusters = data?.clusters || [];
  const activeClusters = clusters.filter((c) => !resolved.has(c.cluster_id));
  const resolvedCount = resolved.size;
  const totalClusters = clusters.length;
  const progressPct = totalClusters > 0 ? Math.round((resolvedCount / totalClusters) * 100) : 100;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const autoMerge = useMutation({
    mutationFn: async (cluster: Cluster) => {
      setMergingCluster(cluster.cluster_id);
      const { data, error } = await supabase.functions.invoke("merge-memories", {
        body: {
          workspace_id: workspaceId,
          member_ids: cluster.members.map((m) => m.id),
          action: "auto_merge",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, cluster) => {
      toast.success(`Merged ${cluster.members.length} memories into one`);
      setResolved((prev) => new Set(prev).add(cluster.cluster_id));
      setMergingCluster(null);
      queryClient.invalidateQueries({ queryKey: ["memory-clusters"] });
    },
    onError: (err: any) => {
      toast.error("Merge failed: " + (err.message || String(err)));
      setMergingCluster(null);
    },
  });

  const pickCanonical = useMutation({
    mutationFn: async ({ cluster, canonicalId }: { cluster: Cluster; canonicalId: string }) => {
      const toArchive = cluster.members.filter((m) => m.id !== canonicalId).map((m) => m.id);
      const { error } = await (supabase as any)
        .from("assistant_memory")
        .update({ status: "archived" })
        .in("id", toArchive);
      if (error) throw error;
    },
    onSuccess: (_, { cluster }) => {
      toast.success("Canonical memory kept, others archived");
      setResolved((prev) => new Set(prev).add(cluster.cluster_id));
      setPicking(null);
      setPickedId(null);
      queryClient.invalidateQueries({ queryKey: ["memory-clusters"] });
    },
    onError: (err: any) => toast.error("Failed: " + (err.message || String(err))),
  });

  const keepSeparate = useCallback(
    (clusterId: string) => {
      setResolved((prev) => new Set(prev).add(clusterId));
      toast.success("Cluster marked as reviewed");
    },
    []
  );

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/memory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <Layers className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Memory Consolidation</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalClusters}</p>
              <p className="text-xs text-muted-foreground">Clusters found</p>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{data?.total_memories || 0}</p>
              <p className="text-xs text-muted-foreground">Total memories</p>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{data?.duplication_rate || 0}%</p>
              <p className="text-xs text-muted-foreground">Duplication rate</p>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{resolvedCount}/{totalClusters}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>
      )}

      {totalClusters > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{resolvedCount} of {totalClusters} clusters resolved</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {!isLoading && totalClusters > 0 && activeClusters.length === 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-10 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-400">Memory store is clean</h2>
            <p className="text-sm text-muted-foreground">All duplicate clusters have been resolved.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && totalClusters === 0 && (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-10 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400 opacity-50" />
            <h2 className="text-lg font-semibold">No duplicates detected</h2>
            <p className="text-sm text-muted-foreground">
              Your memory store has no clusters with &gt;90% similarity. Everything looks clean.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/20 bg-card/30">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeClusters.map((cluster) => {
        const isExpanded = expanded.has(cluster.cluster_id);
        const isPicking = picking === cluster.cluster_id;
        const isMerging = mergingCluster === cluster.cluster_id;

        return (
          <Card
            key={cluster.cluster_id}
            className="border-border/30 bg-card/40 overflow-hidden transition-all"
          >
            <button
              onClick={() => toggleExpand(cluster.cluster_id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/10 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate capitalize">{cluster.topic_label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cluster.members.length} memories · avg confidence {Math.round(cluster.avg_confidence * 100)}%
                  · similarity {Math.round(cluster.avg_similarity * 100)}%
                </p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {cluster.members.length} items
              </Badge>
            </button>

            {isExpanded && (
              <div className="border-t border-border/20">
                <div className="p-4 overflow-x-auto">
                  <div className="flex gap-3 min-w-max">
                    {cluster.members.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isPicking) {
                            setPickedId(m.id === pickedId ? null : m.id);
                          }
                        }}
                        className={cn(
                          "w-72 shrink-0 rounded-lg border p-3 space-y-2 transition-all",
                          isPicking && "cursor-pointer",
                          isPicking && pickedId === m.id
                            ? "border-primary bg-primary/10"
                            : "border-border/30 bg-background/50"
                        )}
                      >
                        <p className="text-sm font-mono leading-relaxed">{m.content}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", confidenceBarColor(m.confidence_score))}
                              style={{ width: `${Math.round((m.confidence_score || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round((m.confidence_score || 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", agentColors[m.agent_id] || agentColors.global)}>
                            {m.agent_id}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {safeFormat(m.created_at, "MMM d")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/20 p-3 flex flex-wrap gap-2 items-center">
                  {isPicking ? (
                    <>
                      <p className="text-xs text-muted-foreground mr-2">Click a memory to keep →</p>
                      <Button
                        size="sm"
                        disabled={!pickedId || pickCanonical.isPending}
                        onClick={() =>
                          pickedId && pickCanonical.mutate({ cluster, canonicalId: pickedId })
                        }
                        className="gap-1.5"
                      >
                        {pickCanonical.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Confirm selection
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPicking(null);
                          setPickedId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => autoMerge.mutate(cluster)}
                        disabled={isMerging}
                        className="gap-1.5"
                      >
                        {isMerging ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Merge className="h-3.5 w-3.5" />
                        )}
                        Auto-merge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPicking(cluster.cluster_id);
                          setPickedId(null);
                        }}
                        className="gap-1.5"
                      >
                        <MousePointerClick className="h-3.5 w-3.5" />
                        Pick canonical
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => keepSeparate(cluster.cluster_id)}
                        className="gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Keep separate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
