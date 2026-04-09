import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ThumbsUp, ThumbsDown, Info, Loader2, AlertTriangle, Brain } from "lucide-react";
import { toast } from "sonner";

const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";

interface SearchResult {
  id: string;
  content: string;
  memory_type: string | null;
  origin: string;
  tags: string[] | null;
  entity_type: string | null;
  confidence_score: number | null;
  importance_score: number | null;
  is_pinned: boolean | null;
  similarity: number;
  created_at: string;
}

export default function MemorySearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");
  const [flagPrompts, setFlagPrompts] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setActiveQuery(query);
    setFlagPrompts({});
    try {
      const { data, error } = await supabase.functions.invoke("search-memories", {
        body: { query, workspace_id: WORKSPACE_ID },
      });
      if (error) throw error;
      setResults(data || []);
    } catch (e: any) {
      toast.error("Search failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleRate = useCallback(async (memoryId: string, rating: "up" | "down") => {
    const delta = rating === "up" ? 0.05 : -0.10;

    setResults(prev => prev.map(r => {
      if (r.id !== memoryId) return r;
      const newConf = Math.max(0, Math.min(1, (r.confidence_score ?? 0.5) + delta));
      return { ...r, confidence_score: newConf };
    }));

    try {
      // Insert rating
      await (supabase as any).from("memory_ratings").insert({
        memory_id: memoryId,
        workspace_id: WORKSPACE_ID,
        rating,
        query_used: activeQuery,
      });

      // Update confidence
      const current = results.find(r => r.id === memoryId);
      const oldConf = current?.confidence_score ?? 0.5;
      const newConf = Math.max(0, Math.min(1, oldConf + delta));

      await (supabase as any).from("assistant_memory")
        .update({ confidence_score: newConf })
        .eq("id", memoryId);

      if (rating === "down" && newConf < 0.2) {
        setFlagPrompts(p => ({ ...p, [memoryId]: true }));
      }
    } catch (e: any) {
      toast.error("Rating failed");
      // Rollback
      setResults(prev => prev.map(r => {
        if (r.id !== memoryId) return r;
        return { ...r, confidence_score: Math.max(0, Math.min(1, (r.confidence_score ?? 0.5) - delta)) };
      }));
    }
  }, [activeQuery, results]);

  const handleFlagForReview = useCallback(async (memoryId: string) => {
    try {
      await (supabase as any).from("assistant_memory")
        .update({ review_status: "pending" })
        .eq("id", memoryId);
      setFlagPrompts(p => ({ ...p, [memoryId]: false }));
      toast.success("Flagged for review");
    } catch {
      toast.error("Failed to flag");
    }
  }, []);

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "bg-emerald-500";
    if (c >= 0.5) return "bg-amber-500";
    return "bg-red-500";
  };

  const agentColor = (agent: string) => {
    const map: Record<string, string> = {
      claude: "bg-blue-600", chatgpt: "bg-emerald-600", gemini: "bg-amber-600", global: "bg-muted",
    };
    return map[agent?.toLowerCase()] || "bg-muted";
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Memory Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Search the memory store with semantic similarity and provide feedback
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search memories by semantic meaning…"
              className="pl-10 font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{results.length} results for "{activeQuery}"</p>
            {results.map(r => {
              const conf = r.confidence_score ?? 0.5;
              const simPct = Math.round(r.similarity * 100);
              return (
                <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {simPct}% match
                      </Badge>
                      <Badge className={`${agentColor(r.origin)} text-white text-xs`}>
                        {r.origin}
                      </Badge>
                      {r.is_pinned && <Badge variant="secondary" className="text-xs">📌 Pinned</Badge>}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs space-y-1 text-xs">
                        <p><strong>Why retrieved?</strong></p>
                        <p>Similarity: {(r.similarity * 100).toFixed(1)}%</p>
                        <p>Confidence: {(conf * 100).toFixed(0)}%</p>
                        {r.tags && r.tags.length > 0 && <p>Tags: {r.tags.join(", ")}</p>}
                        {r.memory_type && <p>Type: {r.memory_type}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Content */}
                  <p className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {r.content}
                  </p>

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Confidence</span>
                      <span>{(conf * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${confidenceColor(conf)}`}
                        style={{
                          width: `${conf * 100}%`,
                          transition: "width 0.5s ease, background-color 0.5s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRate(r.id, "up")}
                      className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRate(r.id, "down")}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" /> Not useful
                    </Button>
                  </div>

                  {/* Flag for review prompt */}
                  {flagPrompts[r.id] && (
                    <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive flex-1">
                        Confidence dropped below 20%. Flag this memory for review?
                      </p>
                      <Button size="sm" variant="destructive" onClick={() => handleFlagForReview(r.id)}>
                        Flag
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setFlagPrompts(p => ({ ...p, [r.id]: false }))}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && activeQuery && (
          <div className="text-center py-16 space-y-2">
            <Search className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No memories found for "{activeQuery}"</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
