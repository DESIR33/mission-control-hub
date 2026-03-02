import { Target, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGoalPace } from "@/hooks/use-goal-pace";
import { motion } from "framer-motion";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const paceColors = {
  green: { border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-400", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  yellow: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-400", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  red: { border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-400", badge: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export function GoalPaceWidget() {
  const { data: pace, isLoading } = useGoalPace();

  if (isLoading || !pace) return null;

  const colors = paceColors[pace.paceZone];
  const isAhead = pace.weeksAheadBehind >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">50K Goal Pace</h3>
          </div>
          <Badge variant="outline" className={`text-[9px] ${colors.badge}`}>
            {isAhead ? (
              <><ArrowUpRight className="w-3 h-3 mr-0.5" />{pace.weeksAheadBehind}w ahead</>
            ) : (
              <><ArrowDownRight className="w-3 h-3 mr-0.5" />{Math.abs(pace.weeksAheadBehind)}w behind</>
            )}
          </Badge>
        </div>

        <div className="flex items-end gap-4 mb-2">
          <div>
            <p className="text-2xl font-bold font-mono text-foreground">{fmtCount(pace.currentSubs)}</p>
            <p className="text-[10px] text-muted-foreground">of {fmtCount(pace.targetSubs)} target</p>
          </div>
          <div className="text-right flex-1">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] text-muted-foreground">
                +{pace.actualWeeklyRate}/wk (need +{pace.requiredWeeklyRate})
              </span>
            </div>
          </div>
        </div>

        <Progress value={pace.progressPercent} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {pace.progressPercent.toFixed(1)}% · {pace.weeksRemaining} weeks remaining
        </p>
      </div>
    </motion.div>
  );
}
