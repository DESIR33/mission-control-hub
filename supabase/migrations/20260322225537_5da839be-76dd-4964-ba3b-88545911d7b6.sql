-- =============================================
-- 1. Add RLS policies to all 12 partition tables
-- =============================================

-- yt_chan_analytics partitions
ALTER TABLE yt_chan_analytics_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_chan_analytics_default FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_chan_analytics_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_chan_analytics_2026 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_chan_analytics_2027 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_chan_analytics_2027 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_chan_analytics_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_chan_analytics_archive FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

-- yt_comments partitions
ALTER TABLE yt_comments_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_comments_default FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_comments_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_comments_2026 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_comments_2027 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_comments_2027 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_comments_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_comments_archive FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

-- yt_sync_logs partitions
ALTER TABLE yt_sync_logs_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_sync_logs_default FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_sync_logs_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_sync_logs_2026 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_sync_logs_2027 ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_sync_logs_2027 FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

ALTER TABLE yt_sync_logs_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_member ON yt_sync_logs_archive FOR ALL TO authenticated USING (is_workspace_member(workspace_id));

-- =============================================
-- 2. Fix overly permissive workspaces INSERT policy
-- =============================================
-- Drop the permissive INSERT and replace with one that only allows
-- workspace creation through the bootstrap_workspace function (service role)
-- or restricts to users who don't yet have a workspace
DROP POLICY "Authenticated users can create workspace" ON workspaces;
CREATE POLICY "Authenticated users can create workspace" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- =============================================
-- 3. The subscribers service_role ALL policy with USING(true) is correct
--    (service_role is trusted). Mark as reviewed — no change needed.
-- =============================================
