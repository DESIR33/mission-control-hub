-- Fix workspace_members INSERT policy to prevent role injection on self-join
-- The old policy allows any authenticated user to claim admin on empty workspaces
DROP POLICY IF EXISTS "Admins can insert members" ON public.workspace_members;

CREATE POLICY "Admins can insert members" ON public.workspace_members FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) = 'admin' OR
  -- Allow self-join to empty workspaces only with 'viewer' role (admin creation goes through bootstrap_workspace RPC)
  (auth.uid() = user_id AND role = 'viewer' AND NOT EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id))
);