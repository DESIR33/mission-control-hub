
CREATE TABLE public.memory_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_memory_comments_memory ON public.memory_comments(memory_id);

CREATE POLICY "Workspace members can view memory comments"
ON public.memory_comments FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create memory comments"
ON public.memory_comments FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory comments"
ON public.memory_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_memory_comments_updated_at
BEFORE UPDATE ON public.memory_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
