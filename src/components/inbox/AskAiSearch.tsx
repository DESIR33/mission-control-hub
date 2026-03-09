import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface AskAiSearchProps {
  onResults: (query: string) => void;
  className?: string;
}

export function AskAiSearch({ onResults, className }: AskAiSearchProps) {
  const { workspaceId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleAskAi = async () => {
    if (!query.trim() || !workspaceId) return;
    setLoading(true);
    setAiResponse(null);
    try {
      // First try to convert natural language to search terms
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `The user wants to search their email inbox. Convert this natural language query into simple search keywords. Return ONLY the search keywords, nothing else.\n\nQuery: "${query}"`,
          skip_tools: true,
        },
      });
      
      if (error) throw error;
      const searchTerms = data?.response?.trim() || query;
      onResults(searchTerms);
      setAiResponse(`Searching for: "${searchTerms}"`);
    } catch {
      toast.error("AI search failed, using direct search");
      onResults(query);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Ask AI: 'find the proposal from John last week'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAskAi();
            }}
            className="pl-8 h-8 text-sm pr-20"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2 text-xs gap-1"
            onClick={handleAskAi}
            disabled={loading}
          >
            {loading ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SparklesIcon className="h-3 w-3 text-primary" />}
            Ask AI
          </Button>
        </div>
      </div>
      {aiResponse && (
        <p className="text-[10px] text-muted-foreground mt-1 px-1">{aiResponse}</p>
      )}
    </div>
  );
}
