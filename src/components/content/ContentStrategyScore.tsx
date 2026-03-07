import { useMemo } from "react";
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useContentSuggestions,
  useGenerateSuggestions,
  useAddSuggestionToQueue,
  type ContentSuggestion,
} from "@/hooks/use-content-strategist";

function RadialScore({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : score >= 40
          ? "text-orange-500"
          : "text-red-500";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <div
        className="absolute inset-0 rounded-full border-muted"
        style={{
          borderWidth: strokeWidth,
          borderStyle: "solid",
          borderRadius: "50%",
        }}
      />
      {/* Score arc using conic gradient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          borderWidth: strokeWidth,
          borderStyle: "solid",
          borderRadius: "50%",
          borderColor: "transparent",
          background: `conic-gradient(
            ${score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444"} ${(score / 100) * 360}deg,
            transparent ${(score / 100) * 360}deg
          )`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeWidth}px), #fff calc(100% - ${strokeWidth}px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeWidth}px), #fff calc(100% - ${strokeWidth}px))`,
        }}
      />
      {/* Center text */}
      <div className="flex flex-col items-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function confidenceColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function confidenceBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "outline";
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
  const isQueued = suggestion.status === "queued";

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
            <h4 className="font-medium leading-tight">{suggestion.title}</h4>
          </div>
          {suggestion.description && (
            <p className="text-sm text-muted-foreground">
              {suggestion.description}
            </p>
          )}
        </div>
        <Badge variant={confidenceBadgeVariant(suggestion.confidence_score)}>
          {suggestion.confidence_score}%
        </Badge>
      </div>

      {/* Confidence progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence</span>
          <span>{suggestion.confidence_score}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${confidenceColor(suggestion.confidence_score)}`}
            style={{ width: `${suggestion.confidence_score}%` }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Predicted Views</div>
        <div className="font-medium">
          {suggestion.predicted_views_low.toLocaleString()} -{" "}
          {suggestion.predicted_views_high.toLocaleString()}
        </div>
        <div className="text-muted-foreground">Optimal Length</div>
        <div className="font-medium">
          {suggestion.optimal_length_minutes} min
        </div>
        {suggestion.best_publish_day && (
          <>
            <div className="text-muted-foreground">Best Day</div>
            <div className="font-medium">{suggestion.best_publish_day}</div>
          </>
        )}
      </div>

      {/* Reasoning */}
      {suggestion.reasoning && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          {suggestion.reasoning}
        </p>
      )}

      {/* Add to Pipeline button */}
      <Button
        size="sm"
        variant={isQueued ? "outline" : "default"}
        disabled={isQueued || isAdding}
        onClick={() => onAddToQueue(suggestion)}
        className="w-full"
      >
        {isQueued ? (
          "Already in Pipeline"
        ) : (
          <>
            <ArrowRight className="mr-1 h-3 w-3" />
            Add to Pipeline
          </>
        )}
      </Button>
    </div>
  );
}

export function ContentStrategyScore() {
  const { data: suggestions, isLoading: suggestionsLoading } =
    useContentSuggestions();
  const generateMutation = useGenerateSuggestions();
  const addToQueueMutation = useAddSuggestionToQueue();

  const strategyScore = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return 0;
    const activeSuggestions = suggestions.filter(
      (s) => s.status === "suggestion" || s.status === "queued"
    );
    if (activeSuggestions.length === 0) return 0;

    // Score based on average confidence of top suggestions
    const avgConfidence =
      activeSuggestions.reduce((sum, s) => sum + s.confidence_score, 0) /
      activeSuggestions.length;

    // Bonus for having suggestions queued (acting on AI advice)
    const queuedRatio =
      activeSuggestions.filter((s) => s.status === "queued").length /
      activeSuggestions.length;
    const queueBonus = queuedRatio * 15;

    // Bonus for having enough suggestions
    const coverageBonus = Math.min(activeSuggestions.length / 5, 1) * 10;

    return Math.min(
      100,
      Math.round(avgConfidence * 0.75 + queueBonus + coverageBonus)
    );
  }, [suggestions]);

  const topSuggestions = useMemo(() => {
    if (!suggestions) return [];
    return suggestions
      .filter((s) => s.status === "suggestion" || s.status === "queued")
      .slice(0, 5);
  }, [suggestions]);

  const patternInsights = useMemo(() => {
    if (!suggestions || suggestions.length < 2) return [];
    const insights: string[] = [];

    // Find highest confidence suggestion type
    const sorted = [...suggestions]
      .filter((s) => s.confidence_score > 0)
      .sort((a, b) => b.confidence_score - a.confidence_score);

    if (sorted.length >= 2) {
      const topDesc = sorted[0].description?.toLowerCase() ?? "";
      const lowDesc = sorted[sorted.length - 1].description?.toLowerCase() ?? "";

      if (topDesc.includes("tutorial")) {
        insights.push(
          "Your tutorials tend to outperform other content formats."
        );
      } else if (topDesc.includes("experiment")) {
        insights.push(
          "Experiment-style content has the highest predicted engagement."
        );
      } else if (topDesc.includes("guide")) {
        insights.push(
          "Comprehensive guides align well with your audience patterns."
        );
      }

      if (sorted[0].predicted_views_high > 0 && sorted[sorted.length - 1].predicted_views_high > 0) {
        const ratio =
          sorted[0].predicted_views_high /
          sorted[sorted.length - 1].predicted_views_high;
        if (ratio >= 1.5) {
          insights.push(
            `Your top format gets ~${ratio.toFixed(1)}x more predicted views than your lowest.`
          );
        }
      }
    }

    // Day insight
    const days = suggestions
      .filter((s) => s.best_publish_day)
      .map((s) => s.best_publish_day!);
    if (days.length > 0) {
      const dayCounts: Record<string, number> = {};
      days.forEach((d) => (dayCounts[d] = (dayCounts[d] || 0) + 1));
      const bestDay = Object.entries(dayCounts).sort(
        ([, a], [, b]) => b - a
      )[0];
      if (bestDay) {
        insights.push(
          `${bestDay[0]} appears most often as the optimal publish day.`
        );
      }
    }

    return insights;
  }, [suggestions]);

  if (suggestionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Loading strategy score...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Content Strategy Score</h3>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          size="sm"
        >
          <Sparkles className="mr-1 h-4 w-4" />
          {generateMutation.isPending
            ? "Generating..."
            : "Generate Suggestions"}
        </Button>
      </div>

      {/* Score + Insights row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Radial Score Card */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
            <RadialScore score={strategyScore} />
            <div className="text-center">
              <p className="text-sm font-medium">
                {strategyScore >= 80
                  ? "Excellent Strategy"
                  : strategyScore >= 60
                    ? "Good Strategy"
                    : strategyScore >= 40
                      ? "Needs Improvement"
                      : "Getting Started"}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on AI analysis of your content patterns
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pattern Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Pattern Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patternInsights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Generate suggestions to see content pattern insights.
              </p>
            ) : (
              <ul className="space-y-3">
                {patternInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Top AI Suggestions
            {topSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {topSuggestions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSuggestions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No suggestions yet. Click "Generate Suggestions" to get AI-powered
                content ideas.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAddToQueue={(s) => addToQueueMutation.mutate(s)}
                  isAdding={addToQueueMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
