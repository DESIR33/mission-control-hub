import { Sparkles, FlaskConical, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  usePendingOptimizations,
  useActiveExperiments,
  useExperimentHistory,
} from "@/hooks/use-video-strategist";

export function StrategistWidget({ onNavigate }: { onNavigate?: () => void }) {
  const pending = usePendingOptimizations();
  const active = useActiveExperiments();
  const history = useExperimentHistory();

  const pendingCount = pending.data?.length || 0;
  const activeCount = active.data?.length || 0;

  // Find best experiment result
  const bestResult = (history.data || [])
    .filter((e) => e.status === "completed" && e.performance_delta)
    .sort((a, b) => (b.performance_delta?.views || 0) - (a.performance_delta?.views || 0))[0];

  return (
    <Card
      className="cursor-pointer transition-all hover:ring-1 hover:ring-primary/20"
      onClick={onNavigate}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Video Strategist</CardTitle>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-400/30 text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-green-400" />
            <div>
              <p className="text-lg font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Experiments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <p className="text-lg font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Recommendations</p>
            </div>
          </div>
        </div>

        {bestResult && bestResult.performance_delta && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-xs font-medium text-green-400">Top Result</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {bestResult.video_title}: +{bestResult.performance_delta.views?.toFixed(1)}% views
            </p>
          </div>
        )}

        {!bestResult && activeCount === 0 && pendingCount === 0 && (
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">
              Recommendations generated daily at 3:00 AM CST
            </p>
          </div>
        )}

        <div className="flex items-center justify-end text-xs text-muted-foreground hover:text-foreground transition-colors">
          View details <ArrowRight className="w-3 h-3 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}
