import { Target, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCurrentSprint } from "@/hooks/use-growth-sprints";
import { differenceInDays, parseISO } from "date-fns";
import { motion } from "framer-motion";

export function SprintWidget() {
  const { data: sprint, isLoading } = useCurrentSprint();

  if (isLoading) return null;
  if (!sprint) return null;

  const tasks = sprint.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const now = new Date();
  const weekEnd = parseISO(sprint.week_end);
  const daysRemaining = Math.max(0, differenceInDays(weekEnd, now));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">This Week's Sprint</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {daysRemaining}d left
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                {completedTasks}/{totalTasks} tasks
              </span>
              <span className="text-xs font-mono text-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {sprint.sub_target > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Sub Target</p>
              <p className="text-sm font-bold font-mono text-foreground">+{sprint.sub_target}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
