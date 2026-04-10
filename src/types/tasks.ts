export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'planning' | 'on_hold' | 'completed' | 'archived';

export interface TaskDomain {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskProject {
  id: string;
  workspace_id: string;
  domain_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  task_count?: number;
  completed_count?: number;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  domain_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  sort_order: number;
  estimated_minutes: number | null;
  is_inbox: boolean;
  entity_id: string | null;
  entity_type: string | null;
  assigned_to: string | null;
  created_by: string | null;
  source: string | null;
  recurrence_rule: string | null;
  category: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  // Joined
  domain?: TaskDomain;
  project?: TaskProject;
  subtask_count?: number;
  subtask_done_count?: number;
  labels?: TaskLabel[];
  dependency_count?: number;
  blocking_count?: number;
}

export interface TaskComment {
  id: string;
  workspace_id: string;
  task_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskLabel {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskFilters {
  domain_id?: string | null;
  project_id?: string | null;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
  is_inbox?: boolean;
  parent_task_id?: string | null;
  due_before?: string;
  due_after?: string;
}
