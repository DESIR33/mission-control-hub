import {
  Clock, TrendingUp, Calendar, Star, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useUploadTimeAnalysis } from "@/hooks/use-upload-time-analysis";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function heatmapColor(score: number, maxScore: number): string {
  if (maxScore === 0) return "hsl(var(--muted))";
  const intensity = score / maxScore;
  if (intensity > 0.75) return "#22c55e";
  if (intensity > 0.5) return "#3b82f6";
  if (intensity > 0.25) return "#eab308";
  if (intensity > 0) return "#64748b";
  return "hsl(var(--muted))";
}

export function UploadTimeAnalyzer() {
  const { data: analysis, isLoading } = useUploadTimeAnalysis();

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Need more videos with publish dates to analyze upload times.</p>
      </div>
    );
  }

  const maxScore = Math.max(...analysis.heatmap.map((s) => s.score), 1);

  return (
    <div className="space-y-4">
      {/* Recommendation */}
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-semibold text-green-400">Best Upload Time</h3>
        </div>
        <p className="text-lg font-bold text-foreground">{analysis.bestTimeLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{analysis.recommendation}</p>
      </div>

      {/* Top Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            Best Times
          </h3>
          <div className="space-y-2">
            {analysis.topSlots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs font-mono">
                    #{i + 1}
                  </Badge>
                  <p className="text-sm text-foreground">{slot.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-foreground">Score: {slot.score}</p>
                  <p className="text-xs text-muted-foreground">{slot.videoCount} video(s)</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Worst Times
          </h3>
          <div className="space-y-2">
            {analysis.worstSlots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="text-sm text-foreground">{slot.label}</p>
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">Score: {slot.score}</p>
                  <p className="text-xs text-muted-foreground">Avg {Math.round(slot.avgViews).toLocaleString()} views</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Slots Bar Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Performance by Time Slot</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={analysis.topSlots}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="avgViews" name="Avg Views" radius={[4, 4, 0, 0]}>
              {analysis.topSlots.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#22c55e" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Upload Time Heatmap</h3>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: "60px repeat(8, 1fr)" }}>
            {/* Header */}
            <div />
            {["12AM", "3AM", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM"].map((h) => (
              <div key={h} className="text-xs text-muted-foreground text-center">{h}</div>
            ))}

            {/* Days */}
            {DAYS_SHORT.map((day) => {
              const daySlots = analysis.heatmap.filter((s) => s.dayOfWeek.startsWith(day.substring(0, 3)));
              return (
                <div key={day} className="contents">
                  <div className="text-xs text-muted-foreground flex items-center">{day}</div>
                  {Array.from({ length: 8 }, (_, i) => {
                    const slot = daySlots.find((s) => s.hour >= i * 3 && s.hour < (i + 1) * 3);
                    const score = slot?.score ?? 0;
                    return (
                      <div
                        key={i}
                        className="h-7 rounded-sm flex items-center justify-center"
                        style={{ backgroundColor: heatmapColor(score, maxScore) }}
                        title={slot ? `${slot.label}: Score ${slot.score}, ${Math.round(slot.avgViews)} avg views` : "No data"}
                      >
                        {score > 0 && (
                          <span className="text-[8px] font-mono text-white/80">{score}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 justify-end">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            {["#64748b", "#eab308", "#3b82f6", "#22c55e"].map((c) => (
              <div key={c} className="w-4 h-2 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
}
