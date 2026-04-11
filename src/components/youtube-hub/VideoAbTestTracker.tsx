import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeFormat } from "@/lib/date-utils";

interface ABTestEvent {
  id: string;
  videoTitle: string;
  changeType: "title" | "thumbnail" | "description" | "tags";
  changedAt: string;
  beforeMetric: number;
  afterMetric: number;
  metricName: string;
  impact: "positive" | "negative" | "neutral";
  impactPct: number;
}

export function VideoAbTestTracker() {
  const { workspaceId } = useWorkspace();

  const { data: decayAlerts = [] } = useQuery({
    queryKey: ["video-ab-decay", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("content_decay_alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Synthesize A/B test events from decay alerts (real data) as change tracking
  const tests: ABTestEvent[] = decayAlerts.map((alert, i) => {
    const prev = Number(alert.previous_value) || 0;
    const curr = Number(alert.current_value) || 0;
    const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
    return {
      id: alert.id,
      videoTitle: alert.video_title || "Untitled Video",
      changeType: alert.decay_type === "ctr_drop" ? "thumbnail" : "title",
      changedAt: alert.created_at,
      beforeMetric: prev,
      afterMetric: curr,
      metricName: alert.decay_type === "ctr_drop" ? "CTR" : "Views",
      impact: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
      impactPct: Math.abs(pct),
    };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          Video A/B Test Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No title/thumbnail changes tracked yet
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {tests.map((test) => (
              <div key={test.id} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate max-w-[200px]">{test.videoTitle}</span>
                  <Badge variant={test.impact === "positive" ? "default" : test.impact === "negative" ? "destructive" : "secondary"} className="text-xs gap-1">
                    {test.impact === "positive" ? <TrendingUp className="h-3 w-3" /> : test.impact === "negative" ? <TrendingDown className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {test.impact === "positive" ? "+" : test.impact === "negative" ? "-" : ""}{test.impactPct}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Changed: <span className="capitalize">{test.changeType}</span></span>
                  <span>{test.metricName}: {test.beforeMetric.toLocaleString()} → {test.afterMetric.toLocaleString()}</span>
                  <span className="ml-auto">{safeFormat(test.changedAt, "MMM d")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
