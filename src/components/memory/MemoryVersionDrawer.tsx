import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, ChevronRight } from "lucide-react";
import { MemoryGraphView } from "./MemoryGraphView";

interface HistoryEntry {
  content: string;
  confidence: number;
  edited_at: string;
  edited_by: string;
  change_note: string;
}

interface MemoryVersionDrawerProps {
  memoryId: string | null;
  content: string;
  confidence: number;
  agentId: string;
  editHistory: HistoryEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void;
}

function computeDiff(oldText: string, newText: string) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const result: { text: string; type: "same" | "added" | "removed" }[] = [];

  const maxLen = Math.max(oldWords.length, newWords.length);
  let oi = 0, ni = 0;

  while (oi < oldWords.length || ni < newWords.length) {
    if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
      result.push({ text: oldWords[oi], type: "same" });
      oi++; ni++;
    } else if (ni < newWords.length && (oi >= oldWords.length || !oldWords.slice(oi, oi + 3).includes(newWords[ni]))) {
      result.push({ text: newWords[ni], type: "added" });
      ni++;
    } else {
      result.push({ text: oldWords[oi], type: "removed" });
      oi++;
    }
    if (result.length > maxLen * 2) break;
  }
  return result;
}

function agentColor(agent: string) {
  if (agent?.toLowerCase().includes("claude")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (agent?.toLowerCase().includes("chatgpt")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (agent?.toLowerCase().includes("gemini")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function MemoryVersionDrawer({
  memoryId,
  content,
  confidence,
  agentId,
  editHistory,
  open,
  onOpenChange,
  onRestored,
}: MemoryVersionDrawerProps) {
  const [restoring, setRestoring] = useState<number | null>(null);

  const handleRestore = useCallback(async (entry: HistoryEntry, index: number) => {
    if (!memoryId) return;
    setRestoring(index);
    try {
      const newHistory: HistoryEntry[] = [
        ...editHistory,
        {
          content,
          confidence,
          edited_at: new Date().toISOString(),
          edited_by: agentId,
          change_note: `Restored from ${new Date(entry.edited_at).toLocaleDateString()}`,
        },
      ];

      const { error } = await (supabase as any)
        .from("assistant_memory")
        .update({
          content: entry.content,
          confidence_score: entry.confidence,
          edit_history: newHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memoryId);

      if (error) throw error;
      toast.success("Version restored successfully");
      onRestored?.();
    } catch (e: any) {
      toast.error("Restore failed: " + e.message);
    } finally {
      setRestoring(null);
    }
  }, [memoryId, content, confidence, agentId, editHistory, onRestored]);

  const sortedHistory = [...editHistory].reverse();
  const versionCount = editHistory.length + 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 border-border/50 bg-background">
        <SheetHeader className="p-5 pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Version History
          </SheetTitle>
          <p className="text-xs text-muted-foreground font-mono line-clamp-1 mt-1">
            {content?.slice(0, 80)}…
          </p>
          <p className="text-xs text-muted-foreground">{versionCount} versions</p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-5 space-y-4">
            {/* Current version */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Live
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${agentColor(agentId)}`}>
                  {agentId}
                </Badge>
              </div>
              <p className="text-sm font-mono text-foreground leading-relaxed">{content}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(confidence ?? 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground">{((confidence ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Knowledge Graph */}
            {memoryId && (
              <MemoryGraphView memoryId={memoryId} />
            )}

            {/* Timeline */}
            {sortedHistory.length > 0 && (
              <div className="relative pl-4 border-l-2 border-border/50 space-y-5">
                {sortedHistory.map((entry, idx) => {
                  const nextContent = idx < sortedHistory.length - 1 ? sortedHistory[idx + 1].content : entry.content;
                  const diff = computeDiff(nextContent, entry.content);
                  const confDelta = idx < sortedHistory.length - 1
                    ? entry.confidence - sortedHistory[idx + 1].confidence
                    : 0;

                  return (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-muted-foreground/40 border-2 border-background" />
                      <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.edited_at), { addSuffix: true })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {confDelta !== 0 && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${confDelta > 0 ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}
                              >
                                {confDelta > 0 ? "+" : ""}{confDelta.toFixed(2)}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] ${agentColor(entry.edited_by)}`}>
                              {entry.edited_by}
                            </Badge>
                          </div>
                        </div>

                        {entry.change_note && (
                          <p className="text-[11px] text-muted-foreground italic">"{entry.change_note}"</p>
                        )}

                        <div className="text-xs font-mono leading-relaxed bg-muted/30 rounded p-2">
                          {diff.map((part, pi) => (
                            <span
                              key={pi}
                              className={
                                part.type === "added"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : part.type === "removed"
                                  ? "bg-red-500/20 text-red-400 line-through"
                                  : ""
                              }
                            >
                              {part.text}
                            </span>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                          disabled={restoring !== null}
                          onClick={() => handleRestore(entry, idx)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          {restoring === idx ? "Restoring…" : "Restore this version"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sortedHistory.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No previous versions — this is the original memory.
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
