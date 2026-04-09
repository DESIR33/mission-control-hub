import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { Brain, Loader2, Sparkles, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ExtractedMemory {
  content: string;
  confidence: number;
  tags: string[];
}

const AGENTS = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "global", label: "Global" },
];

function confidenceColor(c: number) {
  if (c >= 0.8) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (c >= 0.5) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

export default function ConversationMemoryExtractPage() {
  const { workspaceId } = useWorkspace();
  const [text, setText] = useState("");
  const [agent, setAgent] = useState("global");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<ExtractedMemory[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [extracted, setExtracted] = useState(false);

  const handleExtract = useCallback(async () => {
    if (!text.trim() || text.trim().length < 20) {
      toast.error("Paste a conversation with at least 20 characters");
      return;
    }
    setExtracting(true);
    setMemories([]);
    setExtracted(false);
    try {
      const { data, error } = await supabase.functions.invoke("extract-memories", {
        body: { conversation_text: text, agent_id: agent },
      });
      if (error) throw error;
      const mems: ExtractedMemory[] = data?.memories || [];
      setMemories(mems);
      setSelected(new Set(mems.map((_, i) => i)));
      setExtracted(true);
      if (mems.length === 0) toast.info("No memories extracted — try a longer conversation");
      else toast.success(`Extracted ${mems.length} memories`);
    } catch (err: any) {
      toast.error("Extraction failed: " + (err.message || String(err)));
    } finally {
      setExtracting(false);
    }
  }, [text, agent]);

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === memories.length) setSelected(new Set());
    else setSelected(new Set(memories.map((_, i) => i)));
  };

  const handleSave = useCallback(async () => {
    if (!workspaceId || selected.size === 0) return;
    setSaving(true);
    try {
      const rows = Array.from(selected).map((i) => ({
        workspace_id: workspaceId,
        content: memories[i].content,
        confidence_score: memories[i].confidence,
        tags: memories[i].tags,
        origin: "auto_extracted",
        memory_type: "semantic",
        source_type: "conversation",
        review_status: "approved",
        importance_score: memories[i].confidence >= 0.8 ? 0.8 : 0.5,
      }));

      const { error } = await (supabase as any).from("assistant_memory").insert(rows);
      if (error) throw error;
      toast.success(`Saved ${rows.length} memories`);
      setMemories([]);
      setSelected(new Set());
      setText("");
      setExtracted(false);
    } catch (err: any) {
      toast.error("Save failed: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  }, [workspaceId, memories, selected]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/memory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Conversation Memory Extractor</h1>
      </div>

      {/* Input area */}
      <Card className="border-border/50 bg-card/60 backdrop-blur">
        <CardContent className="p-5 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a raw conversation from Claude, ChatGPT, Gemini, or any AI…"
            className="min-h-[200px] font-mono text-sm bg-background/50 resize-y"
            disabled={extracting}
          />
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENTS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExtract} disabled={extracting || !text.trim()} className="gap-2">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Extract Memories
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {extracting && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/30 bg-card/40">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-12" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {extracted && memories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {memories.length} memories extracted · {selected.size} selected
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selected.size === memories.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {memories.map((m, i) => (
            <Card
              key={i}
              className={cn(
                "border-border/30 bg-card/40 transition-colors cursor-pointer",
                selected.has(i) && "border-primary/40 bg-primary/5"
              )}
              onClick={() => toggleSelect(i)}
            >
              <CardContent className="p-4 flex gap-3 items-start">
                <Checkbox
                  checked={selected.has(i)}
                  onCheckedChange={() => toggleSelect(i)}
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-mono leading-relaxed">{m.content}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className={cn("text-xs", confidenceColor(m.confidence))}>
                      {Math.round(m.confidence * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-muted/30">
                      {agent}
                    </Badge>
                    {m.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="w-full gap-2"
            size="lg"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save {selected.size} Selected Memories
          </Button>
        </div>
      )}

      {extracted && memories.length === 0 && !extracting && (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No memories could be extracted. Try pasting a longer or more detailed conversation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
