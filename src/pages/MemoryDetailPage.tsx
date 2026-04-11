import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, } from "date-fns";
import {
  ArrowLeft, Brain, Pin, PinOff, Pencil, Trash2, Star, Eye, Clock,
  MessageSquare, Send, X, Shield, Tag, Link2, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safeFormat, safeFormatDistanceToNow } from "@/lib/date-utils";

const q = (table: string) => (supabase as any).from(table);

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
    <Star key={i} className={`h-3.5 w-3.5 ${i < stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
  ));
}

export default function MemoryDetailPage() {
  const { memoryId } = useParams<{ memoryId: string }>();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Fetch memory
  const { data: memory, isLoading } = useQuery({
    queryKey: ["memory-detail", memoryId],
    queryFn: async () => {
      const { data, error } = await q("assistant_memory").select("*").eq("id", memoryId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!memoryId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["memory-comments", memoryId],
    queryFn: async () => {
      const { data } = await q("memory_comments")
        .select("*, profiles:user_id(full_name, email)")
        .eq("memory_id", memoryId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!memoryId,
  });

  // Fetch access log
  const { data: accessLog = [] } = useQuery({
    queryKey: ["memory-access-log", memoryId],
    queryFn: async () => {
      const { data } = await q("memory_access_log")
        .select("*")
        .eq("memory_id", memoryId)
        .order("accessed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!memoryId,
  });

  // Fetch related memories
  const { data: relatedMemories = [] } = useQuery({
    queryKey: ["memory-related", memoryId],
    queryFn: async () => {
      if (!memory?.related_memory_ids?.length) return [];
      const { data } = await q("assistant_memory")
        .select("id, content, memory_type")
        .in("id", memory.related_memory_ids);
      return data || [];
    },
    enabled: !!memory?.related_memory_ids?.length,
  });

  // Edit history from JSONB
  const editHistory = memory?.edit_history || [];

  // Mutations
  const pinMutation = useMutation({
    mutationFn: async (pinned: boolean) => {
      await q("assistant_memory").update({ is_pinned: pinned }).eq("id", memoryId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memory-detail", memoryId] }); toast.success("Updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await q("assistant_memory").delete().eq("id", memoryId);
    },
    onSuccess: () => { toast.success("Memory deleted"); navigate("/memory"); },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      await q("assistant_memory").update(updates).eq("id", memoryId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-detail", memoryId] });
      setEditing(false);
      toast.success("Memory updated");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await q("memory_comments").insert({
        memory_id: memoryId,
        workspace_id: workspaceId,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-comments", memoryId] });
      setCommentText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      await q("memory_comments").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory-comments", memoryId] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted/30 animate-pulse rounded" />
        <div className="h-[400px] bg-muted/30 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Memory not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/memory")}>Back to Memories</Button>
      </div>
    );
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-0 min-h-screen">
      {/* Main content area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/memory")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Memory</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={TYPE_COLORS[memory.memory_type || "contextual"]}>
                  {memory.memory_type || "unknown"}
                </Badge>
                <Badge variant="outline" className="text-xs">{memory.review_status}</Badge>
                {memory.is_pinned && <Pin className="h-3.5 w-3.5 text-yellow-400" />}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => pinMutation.mutate(!memory.is_pinned)}>
              {memory.is_pinned ? <PinOff className="h-3 w-3 mr-1.5" /> : <Pin className="h-3 w-3 mr-1.5" />}
              {memory.is_pinned ? "Unpin" : "Pin"}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-3 w-3 mr-1.5" /> Delete
            </Button>
          </div>
        </motion.div>

        {/* Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
              {memory.content}
            </p>
          </CardContent>
        </Card>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Scores
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">Confidence</span>
                  <Progress value={(memory.confidence_score ?? 1) * 100} className={`h-2 flex-1 [&>div]:${confidenceColor(memory.confidence_score ?? 1)}`} />
                  <span className="text-xs font-mono">{((memory.confidence_score ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">Importance</span>
                  <div className="flex">{importanceStars(memory.importance_score ?? 0.5)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">Decay Rate</span>
                  <span className="text-xs font-mono">{memory.decay_rate ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Activity
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{memory.source_type || memory.origin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Access Count</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{memory.access_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Accessed</span>
                  <span>{memory.last_accessed_at ? safeFormatDistanceToNow(memory.last_accessed_at, { addSuffix: true }) : "Never"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{safeFormat(memory.created_at, "PPp")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span>{memory.valid_until ? safeFormat(memory.valid_until, "PPp") : "Indefinite"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entity + Tags */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Entity:</span>
                <span>{memory.entity_type ? `${memory.entity_type}${memory.entity_id ? ` · ${memory.entity_id.slice(0, 8)}...` : ""}` : "Global"}</span>
              </div>
            </div>
            {memory.tags?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {memory.tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Memories */}
        {relatedMemories.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Related Memories</h3>
            <div className="space-y-1.5">
              {relatedMemories.map((rm: any) => (
                <Card
                  key={rm.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/memory/${rm.id}`)}
                >
                  <CardContent className="py-2.5 px-4 flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs shrink-0 ${TYPE_COLORS[rm.memory_type || "contextual"]}`}>
                      {rm.memory_type}
                    </Badge>
                    <p className="text-sm truncate">{rm.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Access History */}
        {accessLog.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Access History</h3>
            <div className="space-y-1.5">
              {accessLog.map((log: any) => (
                <div key={log.id} className="text-xs bg-muted/30 rounded p-2.5">
                  <span className="text-muted-foreground">{safeFormatDistanceToNow(log.accessed_at, { addSuffix: true })}</span>
                  <span className="mx-1.5">·</span>
                  <span>{log.accessed_by}</span>
                  {log.query_context && <p className="text-muted-foreground mt-0.5 truncate">{log.query_context}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version History */}
        {Array.isArray(editHistory) && editHistory.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Version History</h3>
            <div className="space-y-1.5">
              {editHistory.map((entry: any, i: number) => (
                <div key={i} className="text-xs bg-muted/30 rounded p-2.5">
                  <span className="text-muted-foreground">
                    {entry.edited_at ? safeFormat(entry.edited_at, "PPp") : `v${i + 1}`}
                  </span>
                  {entry.changed_fields && (
                    <span className="ml-1.5">Changed: {entry.changed_fields.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments sidebar — Confluence style */}
      <div className="w-full lg:w-80 xl:w-96 border-l border-border bg-card/30 flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" /> Comments
          </h3>
          <span className="text-xs text-muted-foreground">{comments.length}</span>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-4">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">No comments yet. Start a discussion.</p>
            )}
            {comments.map((c: any) => {
              const authorName = c.profiles?.full_name || c.profiles?.email || "Unknown";
              const initials = authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={c.id} className="group">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{authorName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {safeFormatDistanceToNow(c.created_at, { addSuffix: true })}
                        </span>
                        {c.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-auto"
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Add comment */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="text-sm resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment(); }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-muted-foreground">⌘+Enter to submit</span>
            <Button size="sm" disabled={!commentText.trim() || addCommentMutation.isPending} onClick={handleSubmitComment}>
              <Send className="h-3 w-3 mr-1.5" />
              {addCommentMutation.isPending ? "Posting..." : "Reply"}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {memory && (
            <EditMemoryForm
              memory={memory}
              onSave={(updates) => updateMutation.mutate(updates)}
              onCancel={() => setEditing(false)}
              isSaving={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EditMemoryForm({ memory, onSave, onCancel, isSaving }: { memory: any; onSave: (u: Record<string, any>) => void; onCancel: () => void; isSaving: boolean }) {
  const [content, setContent] = useState(memory.content);
  const [memoryType, setMemoryType] = useState(memory.memory_type || "semantic");
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
          memory_type: memoryType,
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
