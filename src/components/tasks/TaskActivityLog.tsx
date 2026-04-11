import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Activity, CheckCircle2, ArrowRight, MessageSquare, Plus } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface TaskActivityLogProps {
  taskId: string;
}

interface ActivityEntry {
  id: string;
  activity_type: string;
  title: string | null;
  description: string | null;
  performed_at: string;
  performed_by: string | null;
}

const activityIcons: Record<string, typeof Activity> = {
  task_created: Plus,
  task_completed: CheckCircle2,
  task_status_change: ArrowRight,
  task_comment: MessageSquare,
};

const activityColors: Record<string, string> = {
  task_created: "text-blue-400",
  task_completed: "text-green-400",
  task_status_change: "text-yellow-400",
  task_comment: "text-purple-400",
};

export function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const { workspaceId } = useWorkspace();

  const { data: activities = [] } = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activities")
        .select("*")
        .eq("entity_id", taskId)
        .eq("entity_type", "task")
        .order("performed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ActivityEntry[];
    },
    enabled: !!taskId && !!workspaceId,
  });

  if (!activities.length) {
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {activities.map((a) => {
          const Icon = activityIcons[a.activity_type] || Activity;
          const color = activityColors[a.activity_type] || "text-muted-foreground";
          return (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", color)} />
              <div className="flex-1 min-w-0">
                <span className="text-foreground">{a.title || a.activity_type.replace(/_/g, " ")}</span>
                {a.description && (
                  <span className="text-muted-foreground ml-1">— {a.description}</span>
                )}
              </div>
              <span className="text-muted-foreground shrink-0">
                {safeFormat(a.performed_at, "MMM d, h:mm a")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
