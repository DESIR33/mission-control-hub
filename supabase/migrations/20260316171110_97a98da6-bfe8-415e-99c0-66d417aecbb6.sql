
CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  status text NOT NULL DEFAULT 'active',
  source text DEFAULT 'website',
  source_video_id text,
  source_video_title text,
  guide_requested text,
  guide_delivered_at timestamptz,
  avatar_url text,
  city text,
  state text,
  country text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  notes text,
  engagement_score integer DEFAULT 0,
  engagement_data jsonb DEFAULT '{"emails_sent":0,"emails_opened":0,"emails_clicked":0,"guides_downloaded":0,"last_email_opened_at":null,"last_clicked_at":null}'::jsonb,
  opt_in_confirmed boolean DEFAULT false,
  opt_in_confirmed_at timestamptz,
  promoted_to_contact_id uuid,
  page_url text,
  referrer text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscribers"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can insert subscribers"
  ON public.subscribers FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update subscribers"
  ON public.subscribers FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service role full access on subscribers"
  ON public.subscribers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
