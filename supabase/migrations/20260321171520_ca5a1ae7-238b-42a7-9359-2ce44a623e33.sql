
-- =====================================================
-- 1. youtube_comments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.youtube_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_comment_id text NOT NULL,
  youtube_video_id text,
  video_id text,
  video_title text,
  comment_id text,
  author_name text,
  author_channel_id text,
  author_channel_url text,
  author_profile_url text,
  author_avatar text,
  author_avatar_url text,
  text text,
  text_display text,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  sentiment text,
  priority text DEFAULT 'normal',
  is_replied boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_hearted boolean DEFAULT false,
  our_reply text,
  suggested_reply text,
  status text DEFAULT 'new',
  published_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_comment_id)
);

-- Partial unique on comment_id for webhook processor upsert path
CREATE UNIQUE INDEX IF NOT EXISTS idx_yt_comments_ws_comment_id
  ON public.youtube_comments (workspace_id, comment_id)
  WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_yt_comments_ws_published
  ON public.youtube_comments (workspace_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_comments_ws_video
  ON public.youtube_comments (workspace_id, youtube_video_id);

ALTER TABLE public.youtube_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_comments"
  ON public.youtube_comments FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert youtube_comments"
  ON public.youtube_comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update youtube_comments"
  ON public.youtube_comments FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Service role (edge functions) bypass RLS automatically

-- =====================================================
-- 2. youtube_sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.youtube_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'syncing',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  records_synced integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yt_sync_logs_ws_type_completed
  ON public.youtube_sync_logs (workspace_id, sync_type, completed_at DESC);

ALTER TABLE public.youtube_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_sync_logs"
  ON public.youtube_sync_logs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert youtube_sync_logs"
  ON public.youtube_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update youtube_sync_logs"
  ON public.youtube_sync_logs FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- =====================================================
-- 3. youtube_sync_status
-- =====================================================
CREATE TABLE IF NOT EXISTS public.youtube_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  last_synced_at timestamptz,
  started_at timestamptz,
  error_message text,
  records_synced integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sync_type)
);

CREATE INDEX IF NOT EXISTS idx_yt_sync_status_ws
  ON public.youtube_sync_status (workspace_id);

ALTER TABLE public.youtube_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_sync_status"
  ON public.youtube_sync_status FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert youtube_sync_status"
  ON public.youtube_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update youtube_sync_status"
  ON public.youtube_sync_status FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- =====================================================
-- 4. competitor_stats_history
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competitor_stats_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  subscriber_count bigint,
  video_count integer,
  total_views bigint,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_stats_ws_recorded
  ON public.competitor_stats_history (workspace_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_stats_ws_channel
  ON public.competitor_stats_history (workspace_id, channel_id);

ALTER TABLE public.competitor_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competitor_stats_history"
  ON public.competitor_stats_history FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert competitor_stats_history"
  ON public.competitor_stats_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
