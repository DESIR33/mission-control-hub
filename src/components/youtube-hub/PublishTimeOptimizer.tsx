import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import { useUploadTimeAnalysis, type TimeSlot } from "@/hooks/use-upload-time-analysis";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-green-400";
  if (score >= 30) return "bg-amber-400";
  if (score >= 10) return "bg-amber-300";
  if (score > 0) return "bg-muted-foreground/30";
  return "bg-muted/30";
}

export function PublishTimeOptimizer() {
  const { data: analysis, isLoading } = useUploadTimeAnalysis();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">Loading...</CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Publish Time Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Need at least 3 published videos to generate analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Publish Time Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best time recommendation */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Best Time to Publish</span>
          </div>
          <p className="text-xs text-muted-foreground">{analysis.recommendation}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              <Calendar className="h-3 w-3 mr-1" />
              {analysis.bestDay}
            </Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {analysis.bestTimeLabel.split(" ").pop()}
            </Badge>
          </div>
        </div>

        {/* Heatmap */}
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Performance Heatmap</p>
          <div className="overflow-x-auto">
            <TooltipProvider>
              <div className="grid grid-cols-[auto_repeat(8,1fr)] gap-0.5 min-w-[300px]">
                {/* Header row */}
                <div />
                {HOURS.map((h) => (
                  <div key={h} className="text-[9px] text-muted-foreground text-center">{hourLabel(h)}</div>
                ))}
                {/* Day rows */}
                {DAYS_SHORT.map((day, dayIdx) => (
                  <>
                    <div key={`label-${day}`} className="text-[9px] text-muted-foreground pr-1 flex items-center">{day}</div>
                    {HOURS.map((h) => {
                      const slot = analysis.heatmap.find(
                        (s) => s.dayOfWeek === ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIdx] && s.hour === h
                      );
                      const score = slot?.score ?? 0;
                      return (
                        <Tooltip key={`${day}-${h}`}>
                          <TooltipTrigger asChild>
                            <div className={`h-5 rounded-sm ${scoreColor(score)} cursor-pointer transition-all hover:ring-1 hover:ring-foreground/30`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-medium">{day} {hourLabel(h)}</p>
                            {slot && slot.videoCount > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                <p>Score: {score} | Videos: {slot.videoCount}</p>
                                <p>Avg views: {Math.round(slot.avgViews).toLocaleString()}</p>
                                <p>CTR: {slot.avgCtr.toFixed(1)}%</p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No data</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Top slots */}
        <div>
          <p className="text-xs font-medium text-foreground mb-1">Top 5 Time Slots</p>
          <div className="space-y-1">
            {analysis.topSlots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                <span className="font-medium text-foreground">{slot.label}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{Math.round(slot.avgViews).toLocaleString()} views</span>
                  <span>{slot.avgCtr.toFixed(1)}% CTR</span>
                  <Badge variant="secondary" className="text-[10px]">Score: {slot.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
