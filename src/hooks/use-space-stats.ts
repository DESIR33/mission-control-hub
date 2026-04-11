import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeGetTime } from "@/lib/date-utils";

export interface SpaceStats {
  domain_id: string;
  domain_name: string;
  domain_icon: string | null;
  domain_color: string | null;
  total: number;
  completed: number;
  in_progress: number;
  todo: number;
  cancelled: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  due_soon: number;
  completed_last_7: number;
  created_last_7: number;
  updated_last_7: number;
  projects: { id: string; name: string; status: string; task_count: number; completed_count: number }[];
  upcoming_tasks: { id: string; title: string; status: string; priority: string; due_date: string }[];
}

export function useSpaceStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["space-stats", workspaceId],
    queryFn: async (): Promise<SpaceStats[]> => {
      if (!workspaceId) return [];

      // Fetch domains
      const { data: domains, error: dErr } = await (supabase as any)
        .from("task_domains")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (dErr) throw dErr;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all tasks
      const { data: tasks, error: tErr } = await (supabase as any)
        .from("tasks")
        .select("id, title, status, priority, due_date, domain_id, project_id, created_at, updated_at, completed_at")
        .eq("workspace_id", workspaceId);
      if (tErr) throw tErr;

      // Fetch projects
      const { data: projects, error: pErr } = await (supabase as any)
        .from("task_projects")
        .select("id, name, status, domain_id")
        .eq("workspace_id", workspaceId);
      if (pErr) throw pErr;

      return (domains || []).map((domain: any) => {
        const domainTasks = (tasks || []).filter((t: any) => t.domain_id === domain.id);
        const domainProjects = (projects || []).filter((p: any) => p.domain_id === domain.id);

        const statusCounts = { todo: 0, in_progress: 0, done: 0, cancelled: 0 };
        const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
        let dueSoon = 0;
        let completedLast7 = 0;
        let createdLast7 = 0;
        let updatedLast7 = 0;

        for (const t of domainTasks) {
          statusCounts[t.status as keyof typeof statusCounts] = (statusCounts[t.status as keyof typeof statusCounts] || 0) + 1;
          priorityCounts[t.priority as keyof typeof priorityCounts] = (priorityCounts[t.priority as keyof typeof priorityCounts] || 0) + 1;
          if (t.due_date && t.due_date <= sevenDaysFromNow && t.due_date >= now.toISOString() && t.status !== "done") dueSoon++;
          if (t.completed_at && t.completed_at >= sevenDaysAgo) completedLast7++;
          if (t.created_at >= sevenDaysAgo) createdLast7++;
          if (t.updated_at >= sevenDaysAgo) updatedLast7++;
        }

        const projectStats = domainProjects.map((p: any) => {
          const pTasks = domainTasks.filter((t: any) => t.project_id === p.id);
          return {
            id: p.id,
            name: p.name,
            status: p.status,
            task_count: pTasks.length,
            completed_count: pTasks.filter((t: any) => t.status === "done").length,
          };
        });

        const upcomingTasks = [...domainTasks]
          .filter((t: any) => t.due_date && t.status !== "done" && t.status !== "cancelled")
          .sort((a: any, b: any) => safeGetTime(a.due_date) - safeGetTime(b.due_date))
          .slice(0, 8)
          .map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, due_date: t.due_date }));

        return {
          domain_id: domain.id,
          domain_name: domain.name,
          domain_icon: domain.icon,
          domain_color: domain.color,
          total: domainTasks.length,
          completed: statusCounts.done,
          in_progress: statusCounts.in_progress,
          todo: statusCounts.todo,
          cancelled: statusCounts.cancelled,
          urgent: priorityCounts.urgent,
          high: priorityCounts.high,
          medium: priorityCounts.medium,
          low: priorityCounts.low,
          due_soon: dueSoon,
          completed_last_7: completedLast7,
          created_last_7: createdLast7,
          updated_last_7: updatedLast7,
          projects: projectStats,
          upcoming_tasks: upcomingTasks,
        };
      });
    },
    enabled: !!workspaceId,
    refetchInterval: 60000,
  });
}
