import { useState } from "react";
import {
  Rocket,
  Zap,
  Target,
  CheckSquare,
  TrendingUp,
  Brain,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useCurrentSprint,
  useUpdateSprint,
  type SprintTask,
} from "@/hooks/use-growth-sprints";
import { useGenerateSprint, useSprintReview } from "@/hooks/use-sprint-generator";
import { toast } from "sonner";

const categoryConfig: Record<
  SprintTask["category"],
  { label: string; color: string; icon: typeof Zap }
> = {
  content: { label: "Content", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Brain },
  outreach: { label: "Outreach", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: Rocket },
  engagement: { label: "Engagement", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: Zap },
  deals: { label: "Deals", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Target },
  other: { label: "Other", color: "bg-gray-500/15 text-gray-400 border-gray-500/30", icon: CheckSquare },
};

export function SprintGenerator() {
  const { data: sprint, isLoading: sprintLoading } = useCurrentSprint();
  const { generatedSprint, generate, isGenerating } = useGenerateSprint();
  const { data: review } = useSprintReview();
  const updateSprint = useUpdateSprint();

  if (sprintLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading sprint...</span>
        </CardContent>
      </Card>
    );
  }

  // No current sprint — show generate button
  if (!sprint) {
    return <GenerateSprintView generate={generate} isGenerating={isGenerating} generatedSprint={generatedSprint} />;
  }

  // Sprint exists — show task list
  return <ActiveSprintView sprint={sprint} review={review} updateSprint={updateSprint} />;
}

function GenerateSprintView({
  generate,
  isGenerating,
  generatedSprint,
}: {
  generate: () => Promise<unknown>;
  isGenerating: boolean;
  generatedSprint: ReturnType<typeof useGenerateSprint>["generatedSprint"];
}) {
  const handleGenerate = async () => {
    try {
      await generate();
      toast.success("Sprint generated! Let's crush this week.");
    } catch (err) {
      toast.error("Failed to generate sprint. Check your analytics data.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="w-4 h-4 text-primary" />
          Weekly Growth Sprint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No sprint for this week yet. Generate one based on your current analytics
          to get a focused action plan.
        </p>

        {generatedSprint && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Preview: {generatedSprint.tasks.length} tasks, target +{generatedSprint.subTarget} subs</p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !generatedSprint}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate This Week's Sprint
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveSprintView({
  sprint,
  review,
  updateSprint,
}: {
  sprint: NonNullable<ReturnType<typeof useCurrentSprint>["data"]>;
  review: ReturnType<typeof useSprintReview>["data"];
  updateSprint: ReturnType<typeof useUpdateSprint>;
}) {
  const tasks = sprint.tasks ?? [];
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    try {
      await updateSprint.mutateAsync({
        id: sprint.id,
        tasks: updatedTasks,
      } as any);
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="w-4 h-4 text-primary" />
            This Week's Sprint
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              +{sprint.sub_target} subs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} tasks completed
            </span>
            <span className="text-xs font-mono font-medium text-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {tasks.map((task) => {
            const config = categoryConfig[task.category] ?? categoryConfig.other;
            const IconComponent = config.icon;
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-md border border-border transition-colors cursor-pointer hover:bg-secondary/40 ${
                  task.completed ? "bg-secondary/20 opacity-70" : "bg-card"
                }`}
                onClick={() => handleToggleTask(task.id)}
              >
                <CheckSquare
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    task.completed
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      task.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Sprint summary / review */}
        {review && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Sprint Progress
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
                <p className="text-sm font-bold font-mono text-foreground">
                  {review.tasksCompleted}/{review.totalTasks}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subs Gained</p>
                <p
                  className={`text-sm font-bold font-mono ${
                    review.subsOnTrack ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  +{review.subsGained.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sub Target</p>
                <p className="text-sm font-bold font-mono text-foreground">
                  +{review.subTarget.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{review.insight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
