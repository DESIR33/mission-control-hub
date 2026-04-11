import { useState, useMemo } from "react";
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  BarChart3,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, xAxisDefaults } from "@/lib/chart-theme";
import { differenceInDays, format, parseISO } from "date-fns";
import { safeGetTime } from "@/lib/date-utils";
import {
  useCurrentSprint,
  useSprintHistory,
  useCreateSprint,
  useUpdateSprint,
  type GrowthSprint,
  type SprintTask,
} from "@/hooks/use-growth-sprints";

const CATEGORY_COLORS: Record<string, string> = {
  content: "text-blue-400",
  outreach: "text-purple-400",
  engagement: "text-green-400",
  deals: "text-yellow-400",
  other: "text-muted-foreground",
};

const CATEGORY_BG: Record<string, string> = {
  content: "bg-blue-400/15 text-blue-400",
  outreach: "bg-purple-400/15 text-purple-400",
  engagement: "bg-green-400/15 text-green-400",
  deals: "bg-yellow-400/15 text-yellow-400",
  other: "bg-muted text-muted-foreground",
};

const CATEGORIES: SprintTask["category"][] = [
  "content",
  "outreach",
  "engagement",
  "deals",
  "other",
];

function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

function ActiveSprintCard({
  sprint,
  onToggleTask,
}: {
  sprint: GrowthSprint;
  onToggleTask: (taskId: string) => void;
}) {
  const completedCount = sprint.tasks.filter((t) => t.completed).length;
  const totalCount = sprint.tasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const weekStart = parseISO(sprint.week_start);
  const weekEnd = parseISO(sprint.week_end);
  const today = new Date();
  const daysRemaining = Math.max(0, differenceInDays(weekEnd, today));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Active Sprint
          </CardTitle>
          <Badge variant="default" className="text-xs">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Progress ring + sub target */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProgressRing percent={percent} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold font-mono">{percent}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Sub Target
            </p>
            <p className="text-2xl font-bold font-mono text-foreground">
              +{sprint.sub_target}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} tasks done
            </p>
          </div>
        </div>

        {/* Tasks list */}
        {sprint.tasks.length > 0 && (
          <div className="space-y-1.5">
            {sprint.tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-accent/50 transition-colors"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Circle
                    className={`w-4 h-4 shrink-0 ${CATEGORY_COLORS[task.category]}`}
                  />
                )}
                <span
                  className={`text-sm flex-1 ${
                    task.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${CATEGORY_BG[task.category]}`}
                >
                  {task.category}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewSprintForm({ onCreated }: { onCreated?: () => void }) {
  const createSprint = useCreateSprint();
  const [subTarget, setSubTarget] = useState<number>(100);
  const [tasks, setTasks] = useState<
    { title: string; category: SprintTask["category"] }[]
  >([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] =
    useState<SprintTask["category"]>("content");

  const addTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, { title: trimmed, category: newCategory }]);
    setNewTitle("");
  };

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    createSprint.mutate(
      {
        subTarget,
        tasks: tasks.map((t, i) => ({
          id: `task-${Date.now()}-${i}`,
          title: t.title,
          completed: false,
          category: t.category,
        })),
      },
      { onSuccess: () => onCreated?.() }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          New Growth Sprint
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Plan your weekly growth sprint
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Sub target */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Subscriber Target
          </label>
          <Input
            type="number"
            value={subTarget}
            onChange={(e) => setSubTarget(Number(e.target.value))}
            className="mt-1 font-mono"
            min={1}
          />
        </div>

        {/* Add task row */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Tasks
          </label>
          <div className="mt-1 flex gap-2">
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Task title..."
              className="flex-1"
            />
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v as SprintTask["category"])}>
              <SelectTrigger className="text-xs w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addTask}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Task list preview */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            {tasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-accent/30"
              >
                <Circle
                  className={`w-4 h-4 shrink-0 ${CATEGORY_COLORS[task.category]}`}
                />
                <span className="text-sm flex-1 text-foreground">
                  {task.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${CATEGORY_BG[task.category]}`}
                >
                  {task.category}
                </Badge>
                <button
                  onClick={() => removeTask(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={createSprint.isPending}
          className="w-full"
        >
          {createSprint.isPending ? "Creating..." : "Create Sprint"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SprintHistorySection({ sprints }: { sprints: GrowthSprint[] }) {
  const { chartData, streak } = useMemo(() => {
    const completed = sprints
      .filter((s) => s.status === "completed" || s.status === "active")
      .sort(
        (a, b) =>
          safeGetTime(a.week_start) - safeGetTime(b.week_start)
      );

    const chartData = completed.map((s) => {
      const total = s.tasks.length;
      const done = s.tasks.filter((t) => t.completed).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        week: format(parseISO(s.week_start), "MMM d"),
        rate,
      };
    });

    // Calculate streak (consecutive sprints with 80%+ completion, most recent first)
    let streak = 0;
    const recentFirst = [...completed].reverse();
    for (const s of recentFirst) {
      const total = s.tasks.length;
      const done = s.tasks.filter((t) => t.completed).length;
      const rate = total > 0 ? (done / total) * 100 : 0;
      if (rate >= 80) {
        streak++;
      } else {
        break;
      }
    }

    return { chartData, streak };
  }, [sprints]);

  if (sprints.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Sprint History
          </CardTitle>
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold font-mono text-orange-400">
                {streak}
              </span>
              <span className="text-xs text-muted-foreground">streak</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mini bar chart */}
        {chartData.length > 1 && (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="week"
                {...xAxisDefaults}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number) => [`${value}%`, "Completion"]}
              />
              <Bar
                dataKey="rate"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={800}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Past sprints list */}
        <div className="space-y-2">
          {sprints.slice(0, 6).map((s) => {
            const total = s.tasks.length;
            const done = s.tasks.filter((t) => t.completed).length;
            const rate = total > 0 ? Math.round((done / total) * 100) : 0;
            const isGood = rate >= 80;

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 bg-accent/20"
              >
                <div className="flex items-center gap-2">
                  {isGood ? (
                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(s.week_start), "MMM d")} -{" "}
                    {format(parseISO(s.week_end), "MMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isGood ? "text-green-400" : "text-muted-foreground"
                    }`}
                  >
                    {rate}%
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      s.status === "completed"
                        ? "text-green-400"
                        : s.status === "skipped"
                        ? "text-muted-foreground"
                        : "text-blue-400"
                    }`}
                  >
                    {s.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function GrowthSprintTracker() {
  const { data: currentSprint, isLoading: loadingCurrent } =
    useCurrentSprint();
  const { data: history, isLoading: loadingHistory } = useSprintHistory();
  const updateSprint = useUpdateSprint();

  const handleToggleTask = (taskId: string) => {
    if (!currentSprint) return;
    const updatedTasks = currentSprint.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateSprint.mutate({ id: currentSprint.id, tasks: updatedTasks } as any);
  };

  if (loadingCurrent) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Filter history to exclude current sprint
  const pastSprints = (history ?? []).filter(
    (s) => s.id !== currentSprint?.id
  );

  return (
    <div className="space-y-5">
      {currentSprint ? (
        <ActiveSprintCard
          sprint={currentSprint}
          onToggleTask={handleToggleTask}
        />
      ) : (
        <NewSprintForm />
      )}

      {loadingHistory ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <SprintHistorySection sprints={pastSprints} />
      )}
    </div>
  );
}
