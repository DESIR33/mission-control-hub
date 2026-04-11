import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Merge, X, Loader2 } from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { useState, useCallback } from "react";

const CONFLICT_COLORS: Record<string, string> = {
  factual: "bg-red-500/20 text-red-400 border-red-500/30",
  temporal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  preference: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scope: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

type ConflictRow = {
  id: string;
  conflict_type: string;
  detected_at: string;
  memory_a: { id: string; content: string; confidence_score: number | null; origin: string };
  memory_b: { id: string; content: string; confidence_score: number | null; origin: string };
};

export default function ConflictResolutionPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [mergeConflict, setMergeConflict] = useState<ConflictRow | null>(null);
  const [mergeText, setMergeText] = useState("");

  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ["memory-conflicts-panel", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_conflicts")
        .select("id, conflict_type, detected_at, memory_a_id, memory_b_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending" as any)
        .order("detected_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data?.length) return [];

      const ids = [...new Set(data.flatMap((c: any) => [c.memory_a_id, c.memory_b_id]))];
      const { data: mems } = await supabase
        .from("assistant_memory")
        .select("id, content, confidence_score, origin")
        .in("id", ids);
      const map = new Map((mems || []).map((m: any) => [m.id, m]));
      return data
        .map((c: any) => ({
          id: c.id,
          conflict_type: c.conflict_type,
          detected_at: c.detected_at,
          memory_a: map.get(c.memory_a_id),
          memory_b: map.get(c.memory_b_id),
        }))
        .filter((c: any) => c.memory_a && c.memory_b) as ConflictRow[];
    },
    enabled: !!workspaceId,
  });

  const resolve = useCallback(
    async (conflictId: string, action: "keep_a" | "keep_b" | "dismissed", archiveId?: string) => {
      try {
        if (archiveId) {
          await supabase.from("assistant_memory").update({ status: "archived" } as any).eq("id", archiveId);
        }
        await supabase
          .from("memory_conflicts")
          .update({ status: "resolved" as any, resolution_type: action, resolved_at: new Date().toISOString() })
          .eq("id", conflictId);
        toast.success("Conflict resolved");
        qc.invalidateQueries({ queryKey: ["memory-conflicts-panel"] });
      } catch {
        toast.error("Failed to resolve");
      }
    },
    [qc],
  );

  const handleMerge = async () => {
    if (!mergeConflict || !mergeText.trim()) return;
    try {
      await supabase.from("assistant_memory").insert({
        workspace_id: workspaceId,
        content: mergeText.trim(),
        origin: "merged",
        confidence_score: Math.max(
          mergeConflict.memory_a.confidence_score ?? 0,
          mergeConflict.memory_b.confidence_score ?? 0,
        ),
        review_status: "approved",
        status: "active",
        visibility: "private",
      } as any);
      await supabase
        .from("assistant_memory")
        .update({ status: "archived" } as any)
        .in("id", [mergeConflict.memory_a.id, mergeConflict.memory_b.id]);
      await supabase
        .from("memory_conflicts")
        .update({ status: "resolved" as any, resolution_type: "merged", resolved_at: new Date().toISOString() })
        .eq("id", mergeConflict.id);
      setMergeConflict(null);
      toast.success("Memories merged");
      qc.invalidateQueries({ queryKey: ["memory-conflicts-panel"] });
    } catch {
      toast.error("Merge failed");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Conflicts</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No Conflicts</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Memory store is consistent.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> {conflicts.length} Conflict{conflicts.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conflicts.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CONFLICT_COLORS[c.conflict_type] || ""}`}>
                  {c.conflict_type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {safeFormatDistanceToNow(c.detected_at, { addSuffix: true })}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">A</p>
                  <p className="text-xs line-clamp-2">{c.memory_a.content}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">B</p>
                  <p className="text-xs line-clamp-2">{c.memory_b.content}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => resolve(c.id, "keep_a", c.memory_b.id)}>Keep A</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => resolve(c.id, "keep_b", c.memory_a.id)}>Keep B</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { setMergeConflict(c); setMergeText(`${c.memory_a.content}\n\n${c.memory_b.content}`); }}>
                  <Merge className="h-3 w-3 mr-0.5" /> Merge
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => resolve(c.id, "dismissed")}>
                  <X className="h-3 w-3 mr-0.5" /> Dismiss
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!mergeConflict} onOpenChange={(o) => !o && setMergeConflict(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Merge Memories</DialogTitle>
            <DialogDescription>Edit the combined content, then save.</DialogDescription>
          </DialogHeader>
          <Textarea className="font-mono text-sm min-h-[160px]" value={mergeText} onChange={(e) => setMergeText(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeConflict(null)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={!mergeText.trim()}>Save Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
