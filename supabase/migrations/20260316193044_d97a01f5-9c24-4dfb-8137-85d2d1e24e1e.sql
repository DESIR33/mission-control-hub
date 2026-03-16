
-- 1. Create subscriber_guides table
CREATE TABLE public.subscriber_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  delivery_type text NOT NULL DEFAULT 'email' CHECK (delivery_type IN ('email', 'redirect')),
  file_url text,
  email_subject text,
  email_body text,
  download_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- 2. Create many-to-many junction table for subscriber <-> guide
CREATE TABLE public.subscriber_guide_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.subscriber_guides(id) ON DELETE CASCADE,
  downloaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, guide_id)
);

-- 3. Indexes
CREATE INDEX idx_subscriber_guides_workspace ON public.subscriber_guides(workspace_id);
CREATE INDEX idx_sga_subscriber ON public.subscriber_guide_assignments(subscriber_id);
CREATE INDEX idx_sga_guide ON public.subscriber_guide_assignments(guide_id);
CREATE INDEX idx_sga_workspace ON public.subscriber_guide_assignments(workspace_id);

-- 4. Updated_at trigger for subscriber_guides
CREATE TRIGGER set_subscriber_guides_updated_at
  BEFORE UPDATE ON public.subscriber_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS on subscriber_guides
ALTER TABLE public.subscriber_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view subscriber_guides"
  ON public.subscriber_guides FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert subscriber_guides"
  ON public.subscriber_guides FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update subscriber_guides"
  ON public.subscriber_guides FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete subscriber_guides"
  ON public.subscriber_guides FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- 6. RLS on subscriber_guide_assignments
ALTER TABLE public.subscriber_guide_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view guide assignments"
  ON public.subscriber_guide_assignments FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert guide assignments"
  ON public.subscriber_guide_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete guide assignments"
  ON public.subscriber_guide_assignments FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
