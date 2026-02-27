-- Create a security-definer function to atomically bootstrap a workspace + member
-- This bypasses RLS so there's no chicken-and-egg problem
CREATE OR REPLACE FUNCTION public.bootstrap_workspace(ws_name text, ws_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ws_id uuid;
BEGIN
  -- Only create if user has no workspace yet
  SELECT wm.workspace_id INTO new_ws_id
  FROM workspace_members wm
  WHERE wm.user_id = auth.uid()
  LIMIT 1;

  IF new_ws_id IS NOT NULL THEN
    RETURN new_ws_id;
  END IF;

  INSERT INTO workspaces (name, slug)
  VALUES (ws_name, ws_slug)
  RETURNING id INTO new_ws_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, auth.uid(), 'admin');

  RETURN new_ws_id;
END;
$$;