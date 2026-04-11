import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { safeFormat } from "@/lib/date-utils";

interface BestPractice {
  id: string;
  content: string;
  tags: string[];
  updated_at: string;
}

const q = (table: string) => (supabase as any).from(table);

export function BestPracticesPanel() {
  const { workspaceId } = useWorkspace();
  const [practices, setPractices] = useState<BestPractice[]>([]);
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const { data } = await q("assistant_memory")
        .select("id, content, tags, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("origin", "best_practice")
        .order("updated_at", { ascending: false })
        .limit(50);
      setPractices((data as BestPractice[]) || []);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const addPractice = async () => {
    if (!workspaceId || !newContent.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await q("assistant_memory").insert({
        workspace_id: workspaceId,
        content: newContent.trim(),
        origin: "best_practice",
        tags: ["channel-learning"],
      });
      if (error) throw error;
      toast.success("Best practice saved");
      setNewContent("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removePractice = async (id: string) => {
    await q("assistant_memory").delete().eq("id", id);
    toast.success("Removed");
    await load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Best Practices Memory
          <Badge variant="secondary" className="text-xs ml-auto">{practices.length} entries</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Record what works and what doesn't. The AI uses these when making optimization recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Videos with numbers in titles get 30% more CTR. Thumbnails with red text outperform blue..."
            className="text-xs min-h-[60px] resize-none"
          />
        </div>
        <Button
          size="sm"
          onClick={addPractice}
          disabled={isSaving || !newContent.trim()}
          className="w-full"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          Add Best Practice
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : practices.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {practices.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-2.5 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <BookOpen className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground leading-relaxed">{p.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePractice(p.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 ml-5">
                  {p.tags?.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {safeFormat(p.updated_at, "P")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No best practices yet. Add insights about what works on your channel.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
