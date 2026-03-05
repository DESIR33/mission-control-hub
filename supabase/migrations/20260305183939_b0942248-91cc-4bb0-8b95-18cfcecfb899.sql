
-- Add missing columns to youtube_video_stats that the sync function tries to upsert
ALTER TABLE public.youtube_video_stats
  ADD COLUMN IF NOT EXISTS avg_view_duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Ensure unique constraint exists for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'youtube_video_stats_workspace_video_unique'
  ) THEN
    ALTER TABLE public.youtube_video_stats
      ADD CONSTRAINT youtube_video_stats_workspace_video_unique
      UNIQUE (workspace_id, youtube_video_id);
  END IF;
END $$;
