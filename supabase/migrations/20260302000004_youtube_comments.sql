-- Feature 6: YouTube Comment Engagement Hub
CREATE TABLE IF NOT EXISTS youtube_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  youtube_comment_id TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  video_title TEXT,
  author_name TEXT NOT NULL,
  author_channel_url TEXT,
  author_avatar_url TEXT,
  text_display TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hearted BOOLEAN NOT NULL DEFAULT false,
  our_reply TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative','question')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','replied','flagged')),
  published_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, youtube_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_yt_comments_workspace ON youtube_comments(workspace_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_yt_comments_status ON youtube_comments(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_yt_comments_video ON youtube_comments(workspace_id, youtube_video_id);

ALTER TABLE youtube_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_comments' AND policyname = 'youtube_comments_select') THEN
    CREATE POLICY youtube_comments_select ON youtube_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_comments' AND policyname = 'youtube_comments_all') THEN
    CREATE POLICY youtube_comments_all ON youtube_comments FOR ALL USING (true);
  END IF;
END $$;
