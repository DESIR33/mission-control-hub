import { useState } from "react";
import {
  Target, Plus, Check, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  useCurrentSprint, useSprintHistory, useCreateSprint, useUpdateSprint,
  type GrowthSprint, type SprintTask,
} from "@/hooks/use-growth-sprints";
import { differenceInDays, format } from "date-fns";

const categoryColors: Record<string, string> = {
  content: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  outreach: "bg-green-500/15 text-green-400 border-green-500/30",
  engagement: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  deals: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function WeeklySprintPage() {
  const { data: sprint, isLoading } = useCurrentSprint();
  const { data: history = [] } = useSprintHistory();
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<SprintTask["category"]>("other");
  const [showRetro, setShowRetro] = useState(false);
  const [retroText, setRetroText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const handleCreateSprint = () => {
    createSprint.mutate({
      subTarget: 500,
      goals: ["Publish 2 videos", "Send 10 outreach emails", "Reply to all comments"],
      tasks: [
        { id: crypto.randomUUID(), title: "Publish a long-form video", completed: false, category: "content" },
        { id: crypto.randomUUID(), title: "Publish a YouTube Short", completed: false, category: "content" },
        { id: crypto.randomUUID(), title: "Send 10 outreach emails", completed: false, category: "outreach" },
        { id: crypto.randomUUID(), title: "Reply to all YouTube comments", completed: false, category: "engagement" },
        { id: crypto.randomUUID(), title: "Follow up on pending deals", completed: false, category: "deals" },
      ],
    });
  };

  if (!sprint) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Growth Sprints
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly execution sprints to drive subscriber growth
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">
            No sprint for this week yet. Start one to track your weekly growth goals.
          </p>
          <Button onClick={handleCreateSprint} disabled={createSprint.isPending}>
            {createSprint.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Start This Week's Sprint
          </Button>
        </div>
      </div>
    );
  }

  const completedTasks = sprint.tasks.filter((t) => t.completed).length;
  const totalTasks = sprint.tasks.length;
  const taskPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const daysLeft = Math.max(0, differenceInDays(new Date(sprint.week_end), new Date()));

  const toggleTask = (taskId: string) => {
    const updatedTasks = sprint.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateSprint.mutate({ id: sprint.id, tasks: updatedTasks } as any);
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: SprintTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
      category: newTaskCategory,
    };
    updateSprint.mutate({
      id: sprint.id,
      tasks: [...sprint.tasks, newTask],
    } as any);
    setNewTaskTitle("");
  };

  const saveRetro = () => {
    updateSprint.mutate({
      id: sprint.id,
      retrospective: retroText,
      status: "completed",
    } as any);
    setShowRetro(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Growth Sprint
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of {format(new Date(sprint.week_start), "MMM d")} – {format(new Date(sprint.week_end), "MMM d, yyyy")}
          </p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          {sprint.status}
        </Badge>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sub Target</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">+{sprint.sub_target}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasks Done</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{completedTasks}/{totalTasks}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Days Left</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{daysLeft}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Progress</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{taskPercent.toFixed(0)}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Sprint Progress</h3>
          <span className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} tasks</span>
        </div>
        <Progress value={taskPercent} className="h-3" />
      </div>

      {/* Task List */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tasks</h3>
        <div className="space-y-2">
          {sprint.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => toggleTask(task.id)}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                task.completed
                  ? "bg-green-500 border-green-500"
                  : "border-border hover:border-foreground"
              }`}>
                {task.completed && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </span>
              <Badge variant="outline" className={`text-xs ${categoryColors[task.category]}`}>
                {task.category}
              </Badge>
            </div>
          ))}
        </div>

        {/* Add Task */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <input
            className="flex-1 bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <select
            className="bg-muted/50 rounded px-2 py-2 text-xs text-foreground border border-border outline-none"
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value as SprintTask["category"])}
          >
            <option value="content">Content</option>
            <option value="outreach">Outreach</option>
            <option value="engagement">Engagement</option>
            <option value="deals">Deals</option>
            <option value="other">Other</option>
          </select>
          <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Retrospective */}
      <div className="rounded-lg border border-border bg-card p-4">
        <button
          onClick={() => setShowRetro(!showRetro)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold text-foreground">Sprint Retrospective</h3>
          {showRetro ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showRetro && (
          <div className="mt-3 space-y-3">
            <Textarea
              placeholder="What went well? What could improve? What will you do differently next week?"
              value={retroText || sprint.retrospective || ""}
              onChange={(e) => setRetroText(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRetro(false)}>Cancel</Button>
              <Button size="sm" onClick={saveRetro}>Save & Complete Sprint</Button>
            </div>
          </div>
        )}
        {!showRetro && sprint.retrospective && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sprint.retrospective}</p>
        )}
      </div>

      {/* Sprint History */}
      <div className="rounded-lg border border-border bg-card p-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold text-foreground">Past Sprints ({history.length})</h3>
          {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showHistory && history.length > 0 && (
          <div className="mt-3 space-y-2">
            {history.filter((s) => s.id !== sprint.id).map((s) => {
              const done = s.tasks.filter((t) => t.completed).length;
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      Week of {format(new Date(s.week_start), "MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {done}/{s.tasks.length} tasks · +{s.sub_target} sub target
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{s.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

