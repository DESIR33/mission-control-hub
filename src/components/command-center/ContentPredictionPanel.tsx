import { useState } from "react";
import {
  Sparkles, Trophy, Target, Plus, Trash2, Loader2,
  CheckCircle2, XCircle, BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

interface TitleScore {
  title: string;
  predictedCtr: number;
  confidence: number;
  reasoning: string;
}

interface Prediction {
  id: string;
  titles: string[];
  scores: TitleScore[];
  winner: string;
  status: string;
  actual_ctr: number | null;
  created_at: string;
}

export function ContentPredictionPanel() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [titles, setTitles] = useState<string[]>(["", ""]);
  const [scoring, setScoring] = useState(false);
  const [results, setResults] = useState<TitleScore[] | null>(null);

  // Fetch historical predictions
  const { data: predictions = [], isLoading: predictionsLoading } = useQuery({
    queryKey: ["content-predictions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_predictions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as Prediction[];
    },
    enabled: !!workspaceId,
  });

  // Measured predictions for accuracy
  const { data: measuredPredictions = [] } = useQuery({
    queryKey: ["content-predictions-measured", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_predictions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("status", "measured")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Prediction[];
    },
    enabled: !!workspaceId,
  });

  const updateTitle = (index: number, value: string) => {
    const updated = [...titles];
    updated[index] = value;
    setTitles(updated);
  };

  const addTitle = () => {
    if (titles.length < 3) {
      setTitles([...titles, ""]);
    }
  };

  const removeTitle = (index: number) => {
    if (titles.length > 2) {
      setTitles(titles.filter((_, i) => i !== index));
    }
  };

  const handleScore = async () => {
    const validTitles = titles.filter((t) => t.trim().length > 0);
    if (validTitles.length < 2) {
      toast.error("Please enter at least 2 title options");
      return;
    }

    setScoring(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-generate-proposals",
        {
          body: {
            workspace_id: workspaceId,
            type: "title_scoring",
            titles: validTitles,
          },
        }
      );

      if (error) throw error;

      const scores: TitleScore[] = data.scores ?? [];
      setResults(scores);

      // Find the winner
      const winner = scores.reduce((best, s) =>
        s.predictedCtr > best.predictedCtr ? s : best
      );

      // Store prediction in database
      await supabase.from("content_predictions" as any).insert({
        workspace_id: workspaceId,
        titles: validTitles,
        scores,
        winner: winner.title,
        status: "predicted",
      } as any);

      queryClient.invalidateQueries({
        queryKey: ["content-predictions", workspaceId],
      });

      toast.success("Titles scored successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to score titles");
    } finally {
      setScoring(false);
    }
  };

  // Compute accuracy stats
  const accuracyStats = (() => {
    if (measuredPredictions.length === 0) return null;
    let correct = 0;
    let totalError = 0;

    for (const pred of measuredPredictions) {
      const scores = pred.scores ?? [];
      const winnerScore = scores.find((s: TitleScore) => s.title === pred.winner);
      if (winnerScore && pred.actual_ctr != null) {
        totalError += Math.abs(winnerScore.predictedCtr - pred.actual_ctr);
        if (winnerScore.predictedCtr >= pred.actual_ctr * 0.8) {
          correct++;
        }
      }
    }

    return {
      total: measuredPredictions.length,
      accuracyRate: Math.round((correct / measuredPredictions.length) * 100),
      avgError: totalError / measuredPredictions.length,
    };
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Title Prediction Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Title input form */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Enter 2-3 title options to get AI-powered CTR predictions.
          </p>
          {titles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">
                {i + 1}.
              </span>
              <Input
                className="flex-1"
                placeholder={`Title option ${i + 1}`}
                value={title}
                onChange={(e) => updateTitle(i, e.target.value)}
              />
              {titles.length > 2 && (
                <button
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => removeTitle(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            {titles.length < 3 && (
              <Button variant="ghost" size="sm" onClick={addTitle}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Option
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleScore}
              disabled={scoring || titles.filter((t) => t.trim()).length < 2}
            >
              {scoring ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Scoring...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Score Titles
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Results</h3>
            {results
              .sort((a, b) => b.predictedCtr - a.predictedCtr)
              .map((score, i) => {
                const isWinner = i === 0;
                return (
                  <div
                    key={score.title}
                    className={`rounded-lg border p-3 ${
                      isWinner
                        ? "border-yellow-500/40 bg-yellow-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {isWinner && (
                          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium text-foreground truncate">
                          {score.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${
                            isWinner
                              ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                              : ""
                          }`}
                        >
                          {score.predictedCtr.toFixed(1)}% CTR
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {Math.round(score.confidence * 100)}% conf
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {score.reasoning}
                    </p>
                  </div>
                );
              })}
          </div>
        )}

        {/* Prediction accuracy */}
        {accuracyStats && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              Prediction Accuracy
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Measured
                </p>
                <p className="text-lg font-bold font-mono text-foreground">
                  {accuracyStats.total}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Accuracy
                </p>
                <p className="text-lg font-bold font-mono text-foreground">
                  {accuracyStats.accuracyRate}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Avg Error
                </p>
                <p className="text-lg font-bold font-mono text-foreground">
                  {accuracyStats.avgError.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent predictions history */}
        {predictionsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          predictions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Predictions
              </h3>
              {predictions.slice(0, 5).map((pred) => (
                <div
                  key={pred.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
                >
                  {pred.status === "measured" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Target className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {pred.winner}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pred.titles.length} options compared{" "}
                      {safeFormatDistanceToNow(pred.created_at, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      pred.status === "measured"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {pred.status === "measured" ? "Measured" : "Predicted"}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
