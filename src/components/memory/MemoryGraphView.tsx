import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Loader2, X } from "lucide-react";

interface GraphNode {
  id: string;
  content: string;
  origin: string;
  tags: string[];
  entity_type: string | null;
  entity_id: string | null;
  depth: number;
  is_seed: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  strength: number;
}

const REL_COLORS: Record<string, string> = {
  related_to: "hsl(var(--muted-foreground))",
  supports: "hsl(var(--primary))",
  contradicts: "hsl(0 70% 55%)",
  supersedes: "hsl(35 90% 55%)",
  derived_from: "hsl(260 60% 60%)",
};

const ORIGIN_COLORS: Record<string, string> = {
  user: "hsl(var(--primary))",
  auto_pipeline: "hsl(35 90% 55%)",
  agent: "hsl(160 60% 45%)",
  extracted: "hsl(260 60% 60%)",
};

function MemoryNodeContent({ data }: { data: any }) {
  return (
    <div
      className={`rounded-lg border p-3 max-w-[220px] shadow-sm transition-all ${
        data.is_seed
          ? "border-primary bg-primary/10"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-mono text-foreground line-clamp-3 mb-1.5">{data.content}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          {data.origin}
        </Badge>
        {(data.tags || []).slice(0, 2).map((t: string) => (
          <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = {
  memory: MemoryNodeContent,
};

function layoutNodes(graphNodes: GraphNode[]): Node[] {
  // Simple radial layout: seed in center, depth-1 in ring, depth-2 outer ring
  const seeds = graphNodes.filter((n) => n.is_seed);
  const others = graphNodes.filter((n) => !n.is_seed);

  const centerX = 400;
  const centerY = 300;

  const nodes: Node[] = [];

  // Place seeds
  seeds.forEach((n, i) => {
    const angle = seeds.length > 1 ? (i / seeds.length) * Math.PI * 2 : 0;
    const r = seeds.length > 1 ? 80 : 0;
    nodes.push({
      id: n.id,
      type: "memory",
      position: { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r },
      data: { ...n },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Place connected nodes by depth
  const byDepth = new Map<number, GraphNode[]>();
  others.forEach((n) => {
    const d = n.depth || 1;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  });

  byDepth.forEach((group, depth) => {
    const radius = 180 + depth * 140;
    group.forEach((n, i) => {
      const angle = (i / group.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: n.id,
        type: "memory",
        position: { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
        data: { ...n },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  });

  return nodes;
}

function buildEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.relationship_type.replace("_", " "),
    labelStyle: { fontSize: 9, fill: "hsl(var(--muted-foreground))" },
    style: {
      stroke: REL_COLORS[e.relationship_type] || REL_COLORS.related_to,
      strokeWidth: Math.max(1, e.strength * 3),
      opacity: 0.6 + e.strength * 0.4,
    },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    animated: e.relationship_type === "contradicts",
  }));
}

interface MemoryGraphViewProps {
  memoryId?: string;
  entityType?: string;
  entityId?: string;
  onClose?: () => void;
}

export function MemoryGraphView({ memoryId, entityType, entityId, onClose }: MemoryGraphViewProps) {
  const { workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  const loadGraph = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("memory-graph-query", {
        body: {
          memory_id: memoryId,
          entity_type: entityType,
          entity_id: entityId,
          workspace_id: workspaceId,
          depth: 2,
        },
      });

      if (error) throw error;

      const graphNodes = (data.nodes || []) as GraphNode[];
      const graphEdges = (data.edges || []) as GraphEdge[];

      setNodes(layoutNodes(graphNodes));
      setEdges(buildEdges(graphEdges));
      setStats({ nodes: graphNodes.length, edges: graphEdges.length });
      setLoaded(true);
    } catch (err) {
      console.error("Graph load error:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, memoryId, entityType, entityId, setNodes, setEdges]);

  if (!loaded) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Network className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Explore how this memory connects to others
        </p>
        <Button size="sm" onClick={loadGraph} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Network className="h-3.5 w-3.5 mr-1" />}
          Load Knowledge Graph
        </Button>
      </div>
    );
  }

  if (stats.nodes <= 1) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">No connected memories found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Knowledge Graph
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {stats.nodes} nodes · {stats.edges} edges
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {Object.entries(REL_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {type.replace("_", " ")}
            </span>
          ))}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="h-[400px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={2}
            pannable
            zoomable
            style={{ height: 80, width: 120 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
