-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  YouTube Command Center – new tables for growth features           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. Competitor Channels ────────────────────────────────────────────
CREATE TABLE public.competitor_channels (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_url  TEXT,
  youtube_channel_id TEXT,
  subscriber_count   INT,
  video_count        INT,
  total_view_count   BIGINT,
  avg_views_per_video INT,
  avg_ctr            NUMERIC(5,2),
  upload_frequency   TEXT, -- e.g. "3/week"
  primary_niche      TEXT,
  notes              TEXT,
  last_synced_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitor_channels_workspace ON public.competitor_channels(workspace_id);
ALTER TABLE public.competitor_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view competitor channels" ON public.competitor_channels
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert competitor channels" ON public.competitor_channels
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update competitor channels" ON public.competitor_channels
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete competitor channels" ON public.competitor_channels
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ── 2. Collaborations ────────────────────────────────────────────────
CREATE TABLE public.collaborations (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_name  TEXT NOT NULL,
  channel_url   TEXT,
  subscriber_count INT,
  niche         TEXT,
  contact_id    UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect','contacted','negotiating','confirmed','published','declined')),
  collab_type   TEXT CHECK (collab_type IN ('guest','interview','collab_video','shoutout','cross_promo','other')),
  expected_sub_gain INT,
  actual_sub_gain   INT,
  video_queue_id    INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  scheduled_date    DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_collaborations_workspace ON public.collaborations(workspace_id);
CREATE INDEX idx_collaborations_status ON public.collaborations(status);
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view collaborations" ON public.collaborations
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert collaborations" ON public.collaborations
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update collaborations" ON public.collaborations
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete collaborations" ON public.collaborations
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ── 3. Content Gaps ──────────────────────────────────────────────────
CREATE TABLE public.content_gaps (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  search_volume TEXT, -- e.g. "high", "medium", "low" or numeric
  competition   TEXT CHECK (competition IN ('low','medium','high')),
  relevance_score NUMERIC(3,2), -- 0-1
  source        TEXT, -- where the gap was identified: "audience_comments", "competitor", "trend", "manual"
  status        TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','planned','in_production','published','dismissed')),
  video_queue_id INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_gaps_workspace ON public.content_gaps(workspace_id);
ALTER TABLE public.content_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view content gaps" ON public.content_gaps
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert content gaps" ON public.content_gaps
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update content gaps" ON public.content_gaps
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete content gaps" ON public.content_gaps
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ── 4. Comment Sentiments ────────────────────────────────────────────
CREATE TABLE public.comment_sentiments (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  video_title     TEXT,
  analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_comments  INT NOT NULL DEFAULT 0,
  positive_count  INT NOT NULL DEFAULT 0,
  neutral_count   INT NOT NULL DEFAULT 0,
  negative_count  INT NOT NULL DEFAULT 0,
  avg_sentiment   NUMERIC(4,3), -- -1 to 1
  top_positive    JSONB, -- [{text, likes, sentiment_score}]
  top_negative    JSONB,
  top_questions   JSONB, -- [{text, likes}]
  keyword_cloud   JSONB, -- [{word, count}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comment_sentiments_workspace ON public.comment_sentiments(workspace_id);
CREATE INDEX idx_comment_sentiments_video ON public.comment_sentiments(youtube_video_id);
ALTER TABLE public.comment_sentiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view comment sentiments" ON public.comment_sentiments
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert comment sentiments" ON public.comment_sentiments
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update comment sentiments" ON public.comment_sentiments
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete comment sentiments" ON public.comment_sentiments
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ── 5. Playlist Analytics ────────────────────────────────────────────
CREATE TABLE public.playlist_analytics (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  playlist_id     TEXT NOT NULL,
  playlist_title  TEXT NOT NULL,
  video_count     INT NOT NULL DEFAULT 0,
  total_views     BIGINT NOT NULL DEFAULT 0,
  avg_views_per_video INT,
  total_watch_time_minutes NUMERIC(12,2),
  avg_completion_rate NUMERIC(5,2), -- percentage
  subscriber_gain INT DEFAULT 0,
  top_entry_video TEXT, -- video title that brings people in
  drop_off_video  TEXT, -- video where people leave
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_playlist_analytics_workspace ON public.playlist_analytics(workspace_id);
ALTER TABLE public.playlist_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view playlist analytics" ON public.playlist_analytics
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert playlist analytics" ON public.playlist_analytics
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update playlist analytics" ON public.playlist_analytics
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete playlist analytics" ON public.playlist_analytics
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- ── 6. Content Calendar Entries ──────────────────────────────────────
CREATE TABLE public.content_calendar_entries (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  status          TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','scripting','filming','editing','scheduled','published')),
  video_queue_id  INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  predicted_views INT,
  predicted_subs_gain INT,
  target_audience TEXT,
  content_type    TEXT CHECK (content_type IN ('long_form','short','livestream','premiere','community_post')),
  tags            TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_calendar_workspace ON public.content_calendar_entries(workspace_id);
CREATE INDEX idx_content_calendar_date ON public.content_calendar_entries(scheduled_date);
ALTER TABLE public.content_calendar_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view calendar entries" ON public.content_calendar_entries
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert calendar entries" ON public.content_calendar_entries
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update calendar entries" ON public.content_calendar_entries
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete calendar entries" ON public.content_calendar_entries
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');
