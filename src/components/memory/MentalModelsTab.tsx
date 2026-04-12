import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Brain, RefreshCw, History, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const q = (table: string) => (supabase as any).from(table);

interface MentalModel {
  id: string;
  name: string;
  model_type: string;
  description: string | null;
  current_content: string | null;
  version: number;
  status: string;
  last_reflected_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ModelHistory {
  id: string;
  model_id: string;
  version: number;
  content: string;
  diff_summary: string | null;
  created_at: string;
}

export function MentalModelsTab() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyModelId, setHistoryModelId] = useState<string | null>(null);

  const { data: models = [], isLoading } = useQuery<MentalModel[]>({
    queryKey: ["mental-models", workspaceId],
    queryFn: async () => {
      const { data, error } = await q("mental_models")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const { data: history = [] } = useQuery<ModelHistory[]>({
    queryKey: ["mental-model-history", historyModelId],
    queryFn: async () => {
      const { data, error } = await q("mental_model_history")
        .select("*")
        .eq("model_id", historyModelId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!historyModelId,
  });

  const reflectMutation = useMutation({
    mutationFn: async (model: MentalModel) => {
      const { data, error } = await supabase.functions.invoke("assistant-memory-manage", {
        body: {
          action: "search",
          workspace_id: workspaceId,
          query: model.name + " " + (model.description || ""),
          limit: 20,
        },
      });
      if (error) throw error;
      // Trigger a reflection via the MCP pattern - for now just notify
      toast({ title: "Reflection triggered", description: `Gathering memories for "${model.name}"...` });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mental-models", workspaceId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const typeColors: Record<string, string> = {
    general: "bg-blue-500/10 text-blue-700",
    strategy: "bg-purple-500/10 text-purple-700",
    preference: "bg-amber-500/10 text-amber-700",
    process: "bg-green-500/10 text-green-700",
    entity_profile: "bg-cyan-500/10 text-cyan-700",
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-16">
        <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">No Mental Models Yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Mental models are synthesized knowledge structures created by reflecting on accumulated memories.
          Use the MCP server's <code className="text-xs">reflect_memory</code> tool to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {models.map((model) => {
        const isExpanded = expandedId === model.id;
        return (
          <Card key={model.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : model.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <h3 className="text-sm font-semibold text-foreground">{model.name}</h3>
                  <Badge variant="outline" className={`text-[10px] h-4 ${typeColors[model.model_type] || ""}`}>
                    {model.model_type}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-4">v{model.version}</Badge>
                </div>
                {model.description && (
                  <p className="text-xs text-muted-foreground ml-6">{model.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground ml-6 mt-1">
                  Last reflected: {model.last_reflected_at ? safeFormat(model.last_reflected_at, "MMM d, yyyy HH:mm") : "Never"}
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => reflectMutation.mutate(model)}
                  disabled={reflectMutation.isPending}
                >
                  {reflectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Reflect
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setHistoryModelId(model.id)}
                    >
                      <History className="w-3 h-3" /> History
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[500px]">
                    <SheetHeader>
                      <SheetTitle>Version History — {model.name}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                      {history.map((h) => (
                        <div key={h.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-[10px]">v{h.version}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {safeFormat(h.created_at, "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          {h.diff_summary && (
                            <p className="text-xs text-muted-foreground mb-2 italic">{h.diff_summary}</p>
                          )}
                          <div className="text-xs text-foreground prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{h.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">No version history yet.</p>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {isExpanded && model.current_content && (
              <div className="mt-3 ml-6 border-t border-border pt-3">
                <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                  <ReactMarkdown>{model.current_content}</ReactMarkdown>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
