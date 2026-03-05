
CREATE TABLE public.video_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (workspace_id, youtube_video_id, company_id)
);

ALTER TABLE public.video_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_companies"
  ON public.video_companies FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video_companies"
  ON public.video_companies FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can delete video_companies"
  ON public.video_companies FOR DELETE
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator']));
