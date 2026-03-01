
-- video_notes: one primary note doc per video per workspace
CREATE TABLE public.video_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  title text NOT NULL DEFAULT 'Video Notes',
  content_md text NOT NULL DEFAULT '',
  post_mortem_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_video_id)
);

CREATE INDEX idx_video_notes_ws_vid ON public.video_notes(workspace_id, youtube_video_id);

ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_notes"
  ON public.video_notes FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video_notes"
  ON public.video_notes FOR INSERT
  WITH CHECK (
    get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor'])
    AND created_by = auth.uid()
  );

CREATE POLICY "Operators+ can update video_notes"
  ON public.video_notes FOR UPDATE
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete video_notes"
  ON public.video_notes FOR DELETE
  USING (get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_video_notes_updated_at
  BEFORE UPDATE ON public.video_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- video_note_entries: optional multi-note timeline
CREATE TABLE public.video_note_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  timestamp_seconds integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_note_entries_ws_vid ON public.video_note_entries(workspace_id, youtube_video_id);

ALTER TABLE public.video_note_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_note_entries"
  ON public.video_note_entries FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video_note_entries"
  ON public.video_note_entries FOR INSERT
  WITH CHECK (
    get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor'])
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can delete video_note_entries"
  ON public.video_note_entries FOR DELETE
  USING (get_workspace_role(workspace_id) = 'admin');

-- video_experiments: A/B tracking
CREATE TABLE public.video_experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  experiment_type text NOT NULL DEFAULT 'title',
  variant_a text NOT NULL DEFAULT '',
  variant_b text NOT NULL DEFAULT '',
  started_at timestamptz,
  ended_at timestamptz,
  ctr_before numeric DEFAULT 0,
  ctr_after numeric DEFAULT 0,
  winner text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_experiments_ws_vid ON public.video_experiments(workspace_id, youtube_video_id);

ALTER TABLE public.video_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_experiments"
  ON public.video_experiments FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video_experiments"
  ON public.video_experiments FOR INSERT
  WITH CHECK (
    get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor'])
    AND created_by = auth.uid()
  );

CREATE POLICY "Operators+ can update video_experiments"
  ON public.video_experiments FOR UPDATE
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete video_experiments"
  ON public.video_experiments FOR DELETE
  USING (get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_video_experiments_updated_at
  BEFORE UPDATE ON public.video_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- video_repurposes: repurposing tracker
CREATE TABLE public.video_repurposes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  repurpose_type text NOT NULL DEFAULT 'short',
  status text NOT NULL DEFAULT 'planned',
  url text,
  published_at timestamptz,
  views integer DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_repurposes_ws_vid ON public.video_repurposes(workspace_id, youtube_video_id);

ALTER TABLE public.video_repurposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_repurposes"
  ON public.video_repurposes FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video_repurposes"
  ON public.video_repurposes FOR INSERT
  WITH CHECK (
    get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor'])
    AND created_by = auth.uid()
  );

CREATE POLICY "Operators+ can update video_repurposes"
  ON public.video_repurposes FOR UPDATE
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete video_repurposes"
  ON public.video_repurposes FOR DELETE
  USING (get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_video_repurposes_updated_at
  BEFORE UPDATE ON public.video_repurposes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
