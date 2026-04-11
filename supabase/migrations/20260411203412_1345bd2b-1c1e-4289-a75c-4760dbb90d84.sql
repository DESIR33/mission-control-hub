
-- Memory folders (nested via parent_id)
CREATE TABLE public.memory_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.memory_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage memory folders"
  ON public.memory_folders FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_memory_folders_workspace ON public.memory_folders(workspace_id);
CREATE INDEX idx_memory_folders_parent ON public.memory_folders(parent_id);

CREATE TRIGGER update_memory_folders_updated_at
  BEFORE UPDATE ON public.memory_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to assistant_memory
ALTER TABLE public.assistant_memory
  ADD COLUMN folder_id UUID REFERENCES public.memory_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_assistant_memory_folder ON public.assistant_memory(folder_id);

-- Memory file attachments
CREATE TABLE public.memory_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.memory_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage memory attachments"
  ON public.memory_attachments FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_memory_attachments_workspace ON public.memory_attachments(workspace_id);
CREATE INDEX idx_memory_attachments_memory ON public.memory_attachments(memory_id);
CREATE INDEX idx_memory_attachments_folder ON public.memory_attachments(folder_id);

-- Storage bucket for memory file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-attachments', 'memory-attachments', false);

CREATE POLICY "Workspace members can upload memory attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-attachments');

CREATE POLICY "Workspace members can view memory attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-attachments');

CREATE POLICY "Workspace members can delete memory attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-attachments');
