import {
  Sparkles, Plus, Clock, Calendar, TrendingUp,
  Target, Brain, Film, Loader2, Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContentSuggestions,
  useGenerateSuggestions,
  useAddSuggestionToQueue,
  type ContentSuggestion,
} from "@/hooks/use-content-strategist";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  suggestion: { label: "Suggestion", variant: "default" },
  queued: { label: "Queued", variant: "secondary" },
  dismissed: { label: "Dismissed", variant: "outline" },
};

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function confidenceColor(score: number): string {
  if (score >= 80) return "text-green-400 bg-green-400/10 border-green-400/30";
  if (score >= 60) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-red-400 bg-red-400/10 border-red-400/30";
}

function SuggestionCard({
  suggestion,
  onAddToQueue,
  isAdding,
}: {
  suggestion: ContentSuggestion;
  onAddToQueue: (s: ContentSuggestion) => void;
  isAdding: boolean;
}) {
  const status = statusConfig[suggestion.status] ?? statusConfig.suggestion;
  const isQueued = suggestion.status === "queued";
  const isDismissed = suggestion.status === "dismissed";

  return (
    <Card className={`transition-all ${isDismissed ? "opacity-50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">
            {suggestion.title}
          </CardTitle>
          <Badge
            variant={status.variant}
            className={`shrink-0 text-xs ${
              suggestion.status === "suggestion"
                ? "bg-blue-500/10 text-blue-400 border-blue-400/30"
                : suggestion.status === "queued"
                ? "bg-green-500/10 text-green-400 border-green-400/30"
                : ""
            }`}
          >
            {isQueued && <Film className="w-3 h-3 mr-1" />}
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {suggestion.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {suggestion.description}
          </p>
        )}

        {/* Predicted Views & Confidence */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-mono font-medium text-foreground">
              {fmtNumber(suggestion.predicted_views_low)}-{fmtNumber(suggestion.predicted_views_high)}
            </span>
            <span className="text-xs text-muted-foreground">predicted views</span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-mono ${confidenceColor(suggestion.confidence_score)}`}
          >
            <Target className="w-3 h-3 mr-1" />
            {suggestion.confidence_score}% confidence
          </Badge>
        </div>

        {/* Details Row */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
          {suggestion.optimal_length_minutes > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{suggestion.optimal_length_minutes} min</span>
            </div>
          )}
          {suggestion.best_publish_day && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{suggestion.best_publish_day}</span>
            </div>
          )}
          {suggestion.best_publish_time && (
            <span className="text-xs">at {suggestion.best_publish_time}</span>
          )}
        </div>

        {/* Reasoning */}
        {suggestion.reasoning && (
          <div className="rounded-md bg-muted/50 p-2.5 border border-border">
            <div className="flex items-start gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {suggestion.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Action */}
        {!isQueued && !isDismissed && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isAdding}
            onClick={() => onAddToQueue(suggestion)}
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-2" />
            )}
            Add to Content Queue
          </Button>
        )}

        {/* Queued indicator with queue link */}
        {isQueued && suggestion.video_queue_id && (
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Film className="w-3 h-3" />
            <span>Added to production queue</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ContentStrategist() {
  const { data: suggestions = [], isLoading } = useContentSuggestions();
  const generateMutation = useGenerateSuggestions();
  const addToQueueMutation = useAddSuggestionToQueue();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const activeSuggestions = suggestions.filter((s) => s.status === "suggestion");
  const queuedSuggestions = suggestions.filter((s) => s.status === "queued");
  const dismissedSuggestions = suggestions.filter((s) => s.status === "dismissed");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-foreground">AI Content Strategist</h2>
          {suggestions.length > 0 && (
            <Badge variant="outline" className="text-xs font-mono">
              {activeSuggestions.length} active
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {generateMutation.isPending ? "Generating..." : "Generate New Suggestions"}
        </Button>
      </div>

      {/* Summary stats */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{suggestions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{activeSuggestions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Film className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Queued</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{queuedSuggestions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Confidence</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {suggestions.length > 0
                ? Math.round(suggestions.reduce((s, v) => s + v.confidence_score, 0) / suggestions.length)
                : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Suggestion Cards Grid */}
      {suggestions.length > 0 ? (
        <div className="space-y-6">
          {/* Active suggestions */}
          {activeSuggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAddToQueue={(s) => addToQueueMutation.mutate(s)}
                  isAdding={addToQueueMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Queued suggestions */}
          {queuedSuggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Added to Production Queue ({queuedSuggestions.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {queuedSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAddToQueue={(s) => addToQueueMutation.mutate(s)}
                    isAdding={addToQueueMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dismissed suggestions */}
          {dismissedSuggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Dismissed ({dismissedSuggestions.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dismissedSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAddToQueue={(s) => addToQueueMutation.mutate(s)}
                    isAdding={addToQueueMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No content suggestions yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Generate AI-powered content suggestions based on your top performing videos and channel trends.
          </p>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate Suggestions"}
          </Button>
        </div>
      )}
    </div>
  );
}
