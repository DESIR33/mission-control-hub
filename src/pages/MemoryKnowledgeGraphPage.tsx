import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  getBezierPath,
  BaseEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as dagre from "dagre";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";

const AGENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  claude: { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd" },
  chatgpt: { bg: "#1a3d2e", border: "#22c55e", text: "#86efac" },
  gemini: { bg: "#3d3520", border: "#f59e0b", text: "#fcd34d" },
  global: { bg: "#27272a", border: "#71717a", text: "#a1a1aa" },
};

const EDGE_TYPE_COLORS: Record<string, string> = {
  supports: "#22c55e",
  contradicts: "#ef4444",
  derived_from: "#a855f7",
  supersedes: "#71717a",
};

const EDGE_TYPES = ["derived_from", "supports", "contradicts", "supersedes"] as const;

// Custom node
function MemoryNode({ data, selected }: NodeProps) {
  const agent = (data.agent_id as string || "global").toLowerCase();
  const colors = AGENT_COLORS[agent] || AGENT_COLORS.global;
  const confidence = (data.confidence_score as number) ?? 0.5;
  const width = 80 + confidence * 80;

  return (
    <div
      style={{
        width,
        background: colors.bg,
        borderColor: selected ? "#fff" : colors.border,
        color: colors.text,
      }}
      className="rounded-lg border-2 p-2 cursor-pointer transition-shadow hover:shadow-lg"
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <p className="text-[10px] leading-tight line-clamp-3 font-mono">{data.content as string}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[8px] opacity-70">{agent}</span>
        <span className="text-[8px] opacity-70">{(confidence * 100).toFixed(0)}%</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { memory: MemoryNode };

// Custom edge with context menu
function RelationshipEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style } = props;
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const color = EDGE_TYPE_COLORS[(data?.edge_type as string) || "supports"];
  const weight = (data?.weight as number) || 0.5;

  return (
    <BaseEdge
      path={path}
      style={{ ...style, stroke: color, strokeWidth: 1 + weight * 4 }}
    />
  );
}

const edgeTypes = { relationship: RelationshipEdge };

// Layout with dagre
function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  nodes.forEach((n) => {
    const conf = (n.data.confidence_score as number) ?? 0.5;
    const w = 80 + conf * 80;
    g.setNode(n.id, { width: w, height: 60 });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 60, y: pos.y - 30 } };
  });
}

export default function MemoryKnowledgeGraphPage() {
  const { workspaceId } = useWorkspace();
  const wsId = workspaceId || WORKSPACE_ID;
  const qc = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [edgeFilters, setEdgeFilters] = useState<Record<string, boolean>>({
    derived_from: true, supports: true, contradicts: true, supersedes: true,
  });
  const [agentFilters, setAgentFilters] = useState<Record<string, boolean>>({
    claude: true, chatgpt: true, gemini: true, global: true,
  });

  // New edge creation state
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [newEdgeType, setNewEdgeType] = useState<string>("supports");
  const [newEdgeWeight, setNewEdgeWeight] = useState(0.5);

  // Context menu for edge deletion
  const [contextEdge, setContextEdge] = useState<{ id: string; x: number; y: number } | null>(null);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["knowledge-graph", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const [memRes, edgeRes] = await Promise.all([
        supabase
          .from("assistant_memory")
          .select("id, content, confidence_score, agent_id, created_at, status")
          .eq("workspace_id", wsId)
          .neq("status", "archived")
          .limit(200),
        supabase
          .from("memory_edges")
          .select("id, from_id, to_id, edge_type, weight, created_at")
          .eq("workspace_id", wsId),
      ]);
      return { memories: memRes.data || [], edges: edgeRes.data || [] };
    },
  });

  // Build nodes/edges when data changes
  useEffect(() => {
    if (!rawData) return;
    const flowNodes: Node[] = rawData.memories.map((m: any) => ({
      id: m.id,
      type: "memory",
      position: { x: 0, y: 0 },
      data: { ...m },
    }));
    const flowEdges: Edge[] = rawData.edges.map((e: any) => ({
      id: e.id,
      source: e.from_id,
      target: e.to_id,
      type: "relationship",
      data: { edge_type: e.edge_type, weight: Number(e.weight) },
    }));
    const laid = layoutGraph(flowNodes, flowEdges);
    setNodes(laid);
    setEdges(flowEdges);
  }, [rawData, setNodes, setEdges]);

  // Filter
  const filteredNodes = useMemo(
    () => nodes.filter((n) => agentFilters[((n.data.agent_id as string) || "global").toLowerCase()] !== false),
    [nodes, agentFilters],
  );
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          edgeFilters[(e.data?.edge_type as string) || "supports"] !== false &&
          visibleNodeIds.has(e.source) &&
          visibleNodeIds.has(e.target),
      ),
    [edges, edgeFilters, visibleNodeIds],
  );

  // Node click → sidebar
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      const connected = edges
        .filter((e) => e.source === node.id || e.target === node.id)
        .map((e) => {
          const otherId = e.source === node.id ? e.target : e.source;
          const other = nodes.find((n) => n.id === otherId);
          return {
            ...e,
            otherContent: (other?.data.content as string) || "Unknown",
            direction: e.source === node.id ? "outgoing" : "incoming",
          };
        });
      setSelectedNode({ ...node.data, id: node.id, connections: connected });
    },
    [edges, nodes],
  );

  // Connection (drag handle → handle)
  const onConnect = useCallback((conn: Connection) => {
    if (conn.source && conn.target && conn.source !== conn.target) {
      setPendingConnection(conn);
    }
  }, []);

  const saveNewEdge = async () => {
    if (!pendingConnection) return;
    try {
      await supabase.from("memory_edges").insert({
        workspace_id: wsId,
        from_id: pendingConnection.source,
        to_id: pendingConnection.target,
        edge_type: newEdgeType as any,
        weight: newEdgeWeight,
      });
      toast.success("Relationship created");
      qc.invalidateQueries({ queryKey: ["knowledge-graph"] });
    } catch {
      toast.error("Failed to create relationship");
    }
    setPendingConnection(null);
    setNewEdgeType("supports");
    setNewEdgeWeight(0.5);
  };

  // Edge right-click
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextEdge({ id: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const deleteEdge = async () => {
    if (!contextEdge) return;
    try {
      await supabase.from("memory_edges").delete().eq("id", contextEdge.id);
      toast.success("Relationship deleted");
      qc.invalidateQueries({ queryKey: ["knowledge-graph"] });
    } catch {
      toast.error("Failed to delete");
    }
    setContextEdge(null);
  };

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextEdge) return;
    const handler = () => setContextEdge(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextEdge]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Filter bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border flex-wrap">
        <span className="text-sm font-medium text-foreground">Edges:</span>
        {EDGE_TYPES.map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={edgeFilters[t]}
              onChange={() => setEdgeFilters((f) => ({ ...f, [t]: !f[t] }))}
              className="rounded"
            />
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: EDGE_TYPE_COLORS[t] }}
            />
            {t.replace("_", " ")}
          </label>
        ))}
        <span className="mx-2 text-border">|</span>
        <span className="text-sm font-medium text-foreground">Agents:</span>
        {Object.keys(AGENT_COLORS).map((a) => (
          <button
            key={a}
            onClick={() => setAgentFilters((f) => ({ ...f, [a]: !f[a] }))}
            className={`text-xs px-2 py-0.5 rounded-full border transition-opacity ${
              agentFilters[a] ? "opacity-100" : "opacity-30"
            }`}
            style={{
              borderColor: AGENT_COLORS[a].border,
              color: AGENT_COLORS[a].text,
              background: agentFilters[a] ? AGENT_COLORS[a].bg : "transparent",
            }}
          >
            {a}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredNodes.length} nodes · {filteredEdges.length} edges
        </span>
      </div>

      <div className="flex-1 flex relative">
        {/* Graph */}
        <div className="flex-1">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onConnect={onConnect}
            onEdgeContextMenu={onEdgeContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background color="hsl(var(--border))" gap={20} size={1} />
            <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
            <MiniMap
              nodeColor={(n) => {
                const a = ((n.data?.agent_id as string) || "global").toLowerCase();
                return AGENT_COLORS[a]?.border || "#71717a";
              }}
              className="!bg-card !border-border"
            />
          </ReactFlow>
        </div>

        {/* Node detail sidebar */}
        {selectedNode && (
          <div className="w-80 border-l border-border bg-card overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Memory Detail</h3>
              <button onClick={() => setSelectedNode(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm font-mono text-foreground leading-relaxed">{selectedNode.content}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selectedNode.agent_id || "global"}</Badge>
                <span className="text-xs text-muted-foreground">
                  {((selectedNode.confidence_score ?? 0) * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(selectedNode.confidence_score ?? 0) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Created {safeFormatDistanceToNow(selectedNode.created_at, { addSuffix: true })}
              </p>
            </div>

            {selectedNode.connections?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</h4>
                {EDGE_TYPES.map((type) => {
                  const conns = selectedNode.connections.filter(
                    (c: any) => (c.data?.edge_type || "supports") === type,
                  );
                  if (!conns.length) return null;
                  return (
                    <div key={type}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: EDGE_TYPE_COLORS[type] }}>
                        {type.replace("_", " ")} ({conns.length})
                      </p>
                      {conns.map((c: any) => (
                        <p key={c.id} className="text-xs text-muted-foreground line-clamp-2 mb-1 pl-2 border-l border-border">
                          {c.otherContent}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create relationship modal */}
      {pendingConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="p-5 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Create Relationship</h3>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newEdgeType}
                onChange={(e) => setNewEdgeType(e.target.value)}
              >
                {EDGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Weight: {newEdgeWeight.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={newEdgeWeight}
                onChange={(e) => setNewEdgeWeight(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setPendingConnection(null)}>Cancel</Button>
              <Button size="sm" onClick={saveNewEdge}>Create</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edge context menu */}
      {contextEdge && (
        <div
          className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1"
          style={{ left: contextEdge.x, top: contextEdge.y }}
        >
          <button
            className="px-4 py-1.5 text-xs text-destructive hover:bg-muted w-full text-left"
            onClick={deleteEdge}
          >
            Delete relationship
          </button>
        </div>
      )}
    </div>
  );
}
