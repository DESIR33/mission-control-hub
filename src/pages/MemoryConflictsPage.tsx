import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Shield, Merge, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";

type ConflictRow = {
  id: string;
  conflict_type: string;
  detected_at: string;
  status: string;
  memory_a: {
    id: string;
    content: string;
    confidence_score: number | null;
    agent_id: string;
    created_at: string;
  };
  memory_b: {
    id: string;
    content: string;
    confidence_score: number | null;
    agent_id: string;
    created_at: string;
  };
};

const CONFLICT_COLORS: Record<string, string> = {
  factual: "bg-red-500/20 text-red-400 border-red-500/30",
  temporal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  preference: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scope: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function ConfidenceBadge({ score }: { score: number | null }) {
  const v = score ?? 0;
  const cls =
    v >= 0.8
      ? "bg-emerald-500/20 text-emerald-400"
      : v >= 0.5
        ? "bg-amber-500/20 text-amber-400"
        : "bg-red-500/20 text-red-400";
  return <span className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>{(v * 100).toFixed(0)}%</span>;
}

function MemoryPanel({ label, memory }: { label: string; memory: ConflictRow["memory_a"] }) {
  return (
    <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-mono leading-relaxed">{memory.content}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <ConfidenceBadge score={memory.confidence_score} />
        <Badge variant="outline" className="text-xs">{memory.agent_id || "global"}</Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default function MemoryConflictsPage() {
  const { workspaceId } = useWorkspace();
  const wsId = workspaceId || WORKSPACE_ID;
  const qc = useQueryClient();

  const [mergeConflict, setMergeConflict] = useState<ConflictRow | null>(null);
  const [mergeText, setMergeText] = useState("");
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ["memory-conflicts", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_conflicts")
        .select("id, conflict_type, detected_at, status, memory_a_id, memory_b_id")
        .eq("workspace_id", wsId)
        .eq("status", "pending")
        .order("detected_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      const memIds = [...new Set(data.flatMap((c: any) => [c.memory_a_id, c.memory_b_id]))];
      const { data: mems } = await supabase
        .from("assistant_memory")
        .select("id, content, confidence_score, agent_id, created_at")
        .in("id", memIds);

      const memMap = new Map((mems || []).map((m: any) => [m.id, m]));
      return data
        .map((c: any) => ({
          id: c.id,
          conflict_type: c.conflict_type,
          detected_at: c.detected_at,
          status: c.status,
          memory_a: memMap.get(c.memory_a_id),
          memory_b: memMap.get(c.memory_b_id),
        }))
        .filter((c: any) => c.memory_a && c.memory_b) as ConflictRow[];
    },
  });

  const markResolving = (id: string) => setResolving((s) => new Set(s).add(id));

  const resolve = useCallback(
    async (conflictId: string, action: "keep_a" | "keep_b" | "dismissed", archiveId?: string) => {
      markResolving(conflictId);
      try {
        if (archiveId) {
          await supabase
            .from("assistant_memory")
            .update({ status: "archived" } as any)
            .eq("id", archiveId);
        }
        await supabase
          .from("memory_conflicts")
          .update({ status: "resolved" as any, resolution_type: action, resolved_at: new Date().toISOString() })
          .eq("id", conflictId);
        toast.success("Conflict resolved");
        // small delay for exit animation
        setTimeout(() => qc.invalidateQueries({ queryKey: ["memory-conflicts"] }), 400);
      } catch {
        toast.error("Failed to resolve conflict");
        setResolving((s) => { const n = new Set(s); n.delete(conflictId); return n; });
      }
    },
    [qc],
  );

  const handleMergeSave = async () => {
    if (!mergeConflict || !mergeText.trim()) return;
    markResolving(mergeConflict.id);
    setMergeConflict(null);
    try {
      const { data: newMem } = await supabase
        .from("assistant_memory")
        .insert({
          workspace_id: wsId,
          content: mergeText.trim(),
          origin: "merged",
          confidence_score: Math.max(
            mergeConflict.memory_a.confidence_score ?? 0,
            mergeConflict.memory_b.confidence_score ?? 0,
          ),
          agent_id: mergeConflict.memory_a.agent_id || "global",
          review_status: "approved",
          status: "active",
          visibility: "private",
        } as any)
        .select("id")
        .single();

      await supabase
        .from("assistant_memory")
        .update({ status: "archived" } as any)
        .in("id", [mergeConflict.memory_a.id, mergeConflict.memory_b.id]);

      await supabase
        .from("memory_conflicts")
        .update({
          status: "resolved" as any,
          resolution_type: "merged",
          resolved_by_memory_id: newMem?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", mergeConflict.id);

      toast.success("Memories merged successfully");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["memory-conflicts"] }), 400);
    } catch {
      toast.error("Merge failed");
      setResolving((s) => { const n = new Set(s); n.delete(mergeConflict.id); return n; });
    }
  };

  const pending = conflicts.filter((c) => !resolving.has(c.id));

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conflict Resolution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${pending.length} conflict${pending.length !== 1 ? "s" : ""} remaining`}
          </p>
        </div>
        <Shield className="h-8 w-8 text-muted-foreground/40" />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && pending.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No pending conflicts</h2>
          <p className="text-sm text-muted-foreground mt-1">Memory store is consistent.</p>
        </Card>
      )}

      <AnimatePresence mode="popLayout">
        {pending.map((conflict) => (
          <motion.div
            key={conflict.id}
            layout
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${CONFLICT_COLORS[conflict.conflict_type] || ""}`}>
                  {conflict.conflict_type}
                </span>
                <span className="text-xs text-muted-foreground">
                  Detected {formatDistanceToNow(new Date(conflict.detected_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex gap-4 flex-col sm:flex-row">
                <MemoryPanel label="Memory A" memory={conflict.memory_a} />
                <MemoryPanel label="Memory B" memory={conflict.memory_b} />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => resolve(conflict.id, "keep_a", conflict.memory_b.id)}>
                  Keep A
                </Button>
                <Button size="sm" variant="outline" onClick={() => resolve(conflict.id, "keep_b", conflict.memory_a.id)}>
                  Keep B
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMergeConflict(conflict);
                    setMergeText(`${conflict.memory_a.content}\n\n${conflict.memory_b.content}`);
                  }}
                >
                  <Merge className="h-3.5 w-3.5 mr-1" /> Merge
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(conflict.id, "dismissed")}>
                  <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Merge Modal */}
      <Dialog open={!!mergeConflict} onOpenChange={(o) => !o && setMergeConflict(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Merge Memories</DialogTitle>
            <DialogDescription>Edit the combined content below, then save.</DialogDescription>
          </DialogHeader>
          <Textarea
            className="font-mono text-sm min-h-[180px]"
            value={mergeText}
            onChange={(e) => setMergeText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeConflict(null)}>Cancel</Button>
            <Button onClick={handleMergeSave} disabled={!mergeText.trim()}>Save Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
