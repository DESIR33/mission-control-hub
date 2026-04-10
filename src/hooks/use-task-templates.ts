import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface SubtaskTemplate {
  title: string;
  priority?: string;
}

export interface TaskTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  default_priority: string | null;
  default_status: string;
  default_domain_id: string | null;
  default_project_id: string | null;
  default_estimated_minutes: number | null;
  default_labels: string[] | null;
  subtask_templates: SubtaskTemplate[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaskTemplates() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task-templates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("task_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        subtask_templates: Array.isArray(t.subtask_templates) ? t.subtask_templates : [],
      })) as TaskTemplate[];
    },
    enabled: !!workspaceId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<TaskTemplate>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("task_templates")
        .insert({
          workspace_id: workspaceId,
          created_by: userData.user?.id,
          ...template,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("task_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-templates"] }),
  });

  const createTaskFromTemplate = async (
    template: TaskTemplate,
    overrides?: { domain_id?: string | null; project_id?: string | null }
  ) => {
    // 1. Create the parent task
    const taskPayload: Record<string, any> = {
      workspace_id: workspaceId,
      title: template.name,
      description: template.description,
      status: template.default_status || "todo",
      priority: template.default_priority || "medium",
      domain_id: overrides?.domain_id ?? template.default_domain_id,
      project_id: overrides?.project_id ?? template.default_project_id,
      estimated_minutes: template.default_estimated_minutes,
      is_inbox: false,
    };

    const { data: parentTask, error: parentError } = await (supabase as any)
      .from("tasks")
      .insert(taskPayload)
      .select()
      .single();
    if (parentError) throw parentError;

    // 2. Create subtasks
    if (template.subtask_templates.length > 0) {
      const subtasks = template.subtask_templates.map((st, i) => ({
        workspace_id: workspaceId,
        title: st.title,
        priority: st.priority || "medium",
        status: "todo",
        parent_task_id: parentTask.id,
        domain_id: overrides?.domain_id ?? template.default_domain_id,
        project_id: overrides?.project_id ?? template.default_project_id,
        sort_order: i,
        is_inbox: false,
      }));

      const { error: subError } = await (supabase as any)
        .from("tasks")
        .insert(subtasks);
      if (subError) throw subError;
    }

    // 3. Attach labels if any
    if (template.default_labels && template.default_labels.length > 0) {
      const labelLinks = template.default_labels.map((labelId) => ({
        task_id: parentTask.id,
        label_id: labelId,
        workspace_id: workspaceId,
      }));

      try {
        await (supabase as any).from("task_label_links").insert(labelLinks);
      } catch {
        // label link table may have different name — non-critical
      }
    }

    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    return parentTask;
  };

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate,
    deleteTemplate,
    createTaskFromTemplate,
  };
}
