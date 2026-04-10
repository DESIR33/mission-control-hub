
CREATE TABLE public.task_comment_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_task_comment_mentions_comment ON public.task_comment_mentions(comment_id);
CREATE INDEX idx_task_comment_mentions_user ON public.task_comment_mentions(mentioned_user_id);
CREATE INDEX idx_task_comment_mentions_task ON public.task_comment_mentions(task_id);

CREATE POLICY "Workspace members can view mentions"
  ON public.task_comment_mentions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create mentions"
  ON public.task_comment_mentions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Mentioned user can mark as read"
  ON public.task_comment_mentions FOR UPDATE TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());
