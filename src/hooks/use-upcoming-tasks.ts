import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeFormat } from "@/lib/date-utils";
import { addDays, format } from "date-fns";

const q = (table: string) => (supabase as any).from(table);

export interface UpcomingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  project_name?: string;
  project_color?: string;
}

export function useUpcomingTasks() {
  const { workspaceId } = useWorkspace();
  const today = safeFormat(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  return useQuery<UpcomingTask[]>({
    queryKey: ["upcoming-tasks", workspaceId, today],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("tasks")
        .select("id, title, status, priority, due_date, project_id")
        .eq("workspace_id", workspaceId)
        .in("status", ["todo", "in_progress"])
        .not("due_date", "is", null)
        .lte("due_date", nextWeek)
        .order("due_date", { ascending: true })
        .limit(15);
      if (error) throw error;

      // Fetch project names for linked tasks
      const projectIds = [...new Set((data || []).filter((t: any) => t.project_id).map((t: any) => t.project_id))];
      let projectMap: Record<string, { name: string; color: string }> = {};
      if (projectIds.length > 0) {
        const { data: projects } = await q("task_projects")
          .select("id, name, color")
          .in("id", projectIds);
        for (const p of projects || []) {
          projectMap[p.id] = { name: p.name, color: p.color };
        }
      }

      return (data || []).map((t: any) => ({
        ...t,
        project_name: t.project_id ? projectMap[t.project_id]?.name : undefined,
        project_color: t.project_id ? projectMap[t.project_id]?.color : undefined,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
