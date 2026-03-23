
-- Add deal_id to video_queue for bidirectional sponsorship <-> content pipeline linking
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_video_queue_deal ON public.video_queue(deal_id) WHERE deal_id IS NOT NULL;

-- Add youtube_video_id column if it doesn't exist yet (was in a previous migration)
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vq_youtube_video
  ON public.video_queue(workspace_id, youtube_video_id) WHERE youtube_video_id IS NOT NULL;

-- Add script_content if missing
ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS script_content TEXT;
