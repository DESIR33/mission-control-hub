
-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date TIMESTAMPTZ,
  entity_id UUID,
  entity_type TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_status ON public.tasks(workspace_id, status);
CREATE INDEX idx_tasks_due ON public.tasks(workspace_id, due_date);

CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue_task','deal_stage_change','new_contact','ai_proposal_ready')),
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_workspace ON public.notifications(workspace_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(workspace_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- RLS: TASKS
-- ============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Operators+ can update tasks" ON public.tasks
  FOR UPDATE USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Admins can delete tasks" ON public.tasks
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ============================================
-- RLS: NOTIFICATIONS
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notifications" ON public.notifications
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update notifications" ON public.notifications
  FOR UPDATE USING (public.is_workspace_member(workspace_id));

-- ============================================
-- TRIGGER: New contact → notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (workspace_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.workspace_id,
    'new_contact',
    'New contact added',
    NEW.first_name || COALESCE(' ' || NEW.last_name, '') || ' was added to your contacts',
    'contact',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_contact();

-- ============================================
-- TRIGGER: Deal stage change → notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_label TEXT;
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    stage_label := REPLACE(NEW.stage, '_', ' ');
    INSERT INTO public.notifications (workspace_id, type, title, body, entity_type, entity_id)
    VALUES (
      NEW.workspace_id,
      'deal_stage_change',
      'Deal stage updated',
      '"' || NEW.title || '" moved to ' || INITCAP(stage_label),
      'deal',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_deal_stage
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_deal_stage_change();

-- ============================================
-- TRIGGER: Overdue task → notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_overdue_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.due_date < NOW() AND NEW.status != 'done' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE entity_id = NEW.id AND type = 'overdue_task'
    ) THEN
      INSERT INTO public.notifications (workspace_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.workspace_id,
        'overdue_task',
        'Task overdue',
        '"' || NEW.title || '" is past its due date',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_overdue_task
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_overdue_task();
