
-- Delete all duplicate rows keeping only the one with the latest date per workspace_id + youtube_video_id
DELETE FROM youtube_video_analytics
WHERE id NOT IN (
  SELECT DISTINCT ON (workspace_id, youtube_video_id) id
  FROM youtube_video_analytics
  ORDER BY workspace_id, youtube_video_id, date DESC
);

-- Now add the unique constraint
ALTER TABLE youtube_video_analytics
  ADD CONSTRAINT youtube_video_analytics_workspace_video_unique
  UNIQUE (workspace_id, youtube_video_id);
