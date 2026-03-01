-- ============================================
-- FEATURES 2, 13, 15: VIDEO QUEUE ENHANCEMENTS
-- Links to YouTube stats, script workspace, metadata column
-- ============================================

-- Feature 2: Link video queue to YouTube stats
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vq_youtube_video
  ON public.video_queue(workspace_id, youtube_video_id) WHERE youtube_video_id IS NOT NULL;

-- Feature 13: Script workspace
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS script_content TEXT;

-- Feature 15: Ensure metadata column exists for backward compat
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS created_by UUID;
