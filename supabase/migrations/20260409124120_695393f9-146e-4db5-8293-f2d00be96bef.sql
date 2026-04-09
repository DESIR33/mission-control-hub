
-- =============================================
-- 1. TASK DOMAINS
-- =============================================
CREATE TABLE public.task_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_task_domains_workspace ON public.task_domains(workspace_id);

CREATE TRIGGER trg_task_domains_updated
  BEFORE UPDATE ON public.task_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task domains" ON public.task_domains
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can manage task domains" ON public.task_domains
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );
CREATE POLICY "Admins can update task domains" ON public.task_domains
  FOR UPDATE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );
CREATE POLICY "Admins can delete task domains" ON public.task_domains
  FOR DELETE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );

-- =============================================
-- 2. TASK PROJECTS
-- =============================================
CREATE TABLE public.task_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.task_domains(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  start_date DATE,
  end_date DATE,
  sort_order INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraint for status
CREATE OR REPLACE FUNCTION public.validate_task_project_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active','planning','on_hold','completed','archived') THEN
    RAISE EXCEPTION 'Invalid task project status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_task_project_status
  BEFORE INSERT OR UPDATE ON public.task_projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_project_status();

CREATE INDEX idx_task_projects_workspace ON public.task_projects(workspace_id);
CREATE INDEX idx_task_projects_domain ON public.task_projects(domain_id);

CREATE TRIGGER trg_task_projects_updated
  BEFORE UPDATE ON public.task_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task projects" ON public.task_projects
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Contributors+ can insert task projects" ON public.task_projects
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Contributors+ can update task projects" ON public.task_projects
  FOR UPDATE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Operators+ can delete task projects" ON public.task_projects
  FOR DELETE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );

-- =============================================
-- 3. ALTER TASKS TABLE
-- =============================================
-- Expand status check to include 'cancelled'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo','in_progress','done','cancelled'));

-- Expand priority check to include 'urgent'  
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low','medium','high','urgent'));

-- Add new columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.task_domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_minutes INT,
  ADD COLUMN IF NOT EXISTS is_inbox BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_domain ON public.tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_inbox ON public.tasks(workspace_id) WHERE is_inbox = true;

-- =============================================
-- 4. TASK COMMENTS
-- =============================================
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

CREATE TRIGGER trg_task_comments_updated
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task comments" ON public.task_comments
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Contributors+ can insert task comments" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Contributors+ can update task comments" ON public.task_comments
  FOR UPDATE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Operators+ can delete task comments" ON public.task_comments
  FOR DELETE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );

-- =============================================
-- 5. TASK LABELS
-- =============================================
CREATE TABLE public.task_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_task_labels_workspace ON public.task_labels(workspace_id);

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task labels" ON public.task_labels
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Contributors+ can manage task labels" ON public.task_labels
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Contributors+ can update task labels" ON public.task_labels
  FOR UPDATE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Operators+ can delete task labels" ON public.task_labels
  FOR DELETE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );

-- =============================================
-- 6. TASK LABEL ASSIGNMENTS
-- =============================================
CREATE TABLE public.task_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);

CREATE INDEX idx_task_label_assignments_task ON public.task_label_assignments(task_id);
CREATE INDEX idx_task_label_assignments_label ON public.task_label_assignments(label_id);

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS via task's workspace membership
CREATE POLICY "Members can view label assignments" ON public.task_label_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id))
  );
CREATE POLICY "Contributors+ can manage label assignments" ON public.task_label_assignments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.get_workspace_role(t.workspace_id) IN ('admin','operator','contributor'))
  );
CREATE POLICY "Contributors+ can delete label assignments" ON public.task_label_assignments
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.get_workspace_role(t.workspace_id) IN ('admin','operator','contributor'))
  );

-- =============================================
-- 7. SEED DOMAINS & PROJECTS FOR EXISTING WORKSPACES
-- =============================================
INSERT INTO public.task_domains (workspace_id, name, slug, icon, color, sort_order)
SELECT w.id, 'Army', 'army', 'Shield', '#DC2626', 0
FROM public.workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;

INSERT INTO public.task_domains (workspace_id, name, slug, icon, color, sort_order)
SELECT w.id, 'Business', 'business', 'Briefcase', '#2563EB', 1
FROM public.workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- Seed default business projects
INSERT INTO public.task_projects (workspace_id, domain_id, name, description, color, sort_order)
SELECT 
  td.workspace_id,
  td.id,
  p.name,
  p.description,
  p.color,
  p.sort_order
FROM public.task_domains td
CROSS JOIN (VALUES
  ('The Jesus Vazquez Website', 'Personal brand website', '#8B5CF6', 0),
  ('Lab Notes', 'Newsletter and content lab', '#10B981', 1),
  ('Hustling Labs', 'Business ventures and experiments', '#F59E0B', 2)
) AS p(name, description, color, sort_order)
WHERE td.slug = 'business';

-- =============================================
-- 8. AUTO-SEED TRIGGER FOR NEW WORKSPACES
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_task_domains_for_workspace()
RETURNS TRIGGER AS $$
DECLARE
  army_id UUID;
  biz_id UUID;
BEGIN
  INSERT INTO public.task_domains (workspace_id, name, slug, icon, color, sort_order)
  VALUES (NEW.id, 'Army', 'army', 'Shield', '#DC2626', 0)
  RETURNING id INTO army_id;

  INSERT INTO public.task_domains (workspace_id, name, slug, icon, color, sort_order)
  VALUES (NEW.id, 'Business', 'business', 'Briefcase', '#2563EB', 1)
  RETURNING id INTO biz_id;

  INSERT INTO public.task_projects (workspace_id, domain_id, name, description, color, sort_order)
  VALUES
    (NEW.id, biz_id, 'The Jesus Vazquez Website', 'Personal brand website', '#8B5CF6', 0),
    (NEW.id, biz_id, 'Lab Notes', 'Newsletter and content lab', '#10B981', 1),
    (NEW.id, biz_id, 'Hustling Labs', 'Business ventures and experiments', '#F59E0B', 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_seed_task_domains
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_task_domains_for_workspace();
