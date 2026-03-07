import { useState } from "react";
import { Target, TrendingUp, ArrowUpRight, ArrowDownRight, Settings2, Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoalPace, useUpdateGoal } from "@/hooks/use-goal-pace";
import { motion, AnimatePresence } from "framer-motion";

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
  const { data: pace, isLoading, goalRecord } = useGoalPace();
  const updateGoal = useUpdateGoal();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const openEditor = () => {
    setTitle(goalRecord?.title || "Subscriber Goal");
    setTargetValue(String(goalRecord?.target_value || 50000));
    setTargetDate(goalRecord?.target_date || "2027-01-01");
    setCurrentValue(String(goalRecord?.current_value || 0));
    setEditing(true);
  };

  const save = () => {
    updateGoal.mutate({
      id: goalRecord?.id,
      title,
      target_value: parseInt(targetValue) || 50000,
      target_date: targetDate,
      current_value: parseInt(currentValue) || 0,
    });
    setEditing(false);
  };

  if (isLoading) return null;

  // No goal set yet — show create prompt
  if (!pace && !editing) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/5 p-4 text-center">
          <Target className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">No growth goal set</p>
          <Button size="sm" variant="outline" onClick={openEditor}>
            Set a Goal
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Edit Goal
              </h3>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={updateGoal.isPending}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Goal Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target</Label>
                <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Current Value</Label>
                <Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Date</Label>
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`rounded-lg border ${paceColors[pace!.paceZone].border} ${paceColors[pace!.paceZone].bg} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{goalRecord?.title || "Goal Pace"}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-xs ${paceColors[pace!.paceZone].badge}`}>
                    {pace!.weeksAheadBehind >= 0 ? (
                      <><ArrowUpRight className="w-3 h-3 mr-0.5" />{pace!.weeksAheadBehind}w ahead</>
                    ) : (
                      <><ArrowDownRight className="w-3 h-3 mr-0.5" />{Math.abs(pace!.weeksAheadBehind)}w behind</>
                    )}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={openEditor}>
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-end gap-4 mb-2">
                <div>
                  <p className="text-2xl font-bold font-mono text-foreground">{fmtCount(pace!.currentSubs)}</p>
                  <p className="text-xs text-muted-foreground">of {fmtCount(pace!.targetSubs)} target</p>
                </div>
                <div className="text-right flex-1">
                  <span className="text-xs text-muted-foreground">
                    +{pace!.actualWeeklyRate}/wk (need +{pace!.requiredWeeklyRate})
                  </span>
                </div>
              </div>

              <Progress value={pace!.progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {pace!.progressPercent.toFixed(1)}% · {pace!.weeksRemaining} weeks remaining
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
