
CREATE TABLE public.task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_priority text CHECK (default_priority IN ('low','medium','high','urgent')),
  default_status text NOT NULL DEFAULT 'todo' CHECK (default_status IN ('todo','in_progress','done','cancelled')),
  default_domain_id uuid REFERENCES public.task_domains(id) ON DELETE SET NULL,
  default_project_id uuid REFERENCES public.task_projects(id) ON DELETE SET NULL,
  default_estimated_minutes integer,
  default_labels uuid[],
  subtask_templates jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_task_templates_workspace ON public.task_templates(workspace_id);

CREATE POLICY "Workspace members can view templates"
  ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create templates"
  ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update templates"
  ON public.task_templates FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete templates"
  ON public.task_templates FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
