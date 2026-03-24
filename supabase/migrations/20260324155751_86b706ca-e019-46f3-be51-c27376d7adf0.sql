
DROP POLICY IF EXISTS "Admins can view workspace_integrations" ON workspace_integrations;
DROP POLICY IF EXISTS "Admins can insert workspace_integrations" ON workspace_integrations;
DROP POLICY IF EXISTS "Admins can update workspace_integrations" ON workspace_integrations;
DROP POLICY IF EXISTS "Admins can delete workspace_integrations" ON workspace_integrations;

CREATE POLICY "Members can view workspace_integrations"
  ON workspace_integrations FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admin/operator can insert workspace_integrations"
  ON workspace_integrations FOR INSERT
  TO authenticated
  WITH CHECK (get_workspace_role(workspace_id) IN ('admin', 'operator'));

CREATE POLICY "Admin/operator can update workspace_integrations"
  ON workspace_integrations FOR UPDATE
  TO authenticated
  USING (get_workspace_role(workspace_id) IN ('admin', 'operator'));

CREATE POLICY "Admin/operator can delete workspace_integrations"
  ON workspace_integrations FOR DELETE
  TO authenticated
  USING (get_workspace_role(workspace_id) IN ('admin', 'operator'));
