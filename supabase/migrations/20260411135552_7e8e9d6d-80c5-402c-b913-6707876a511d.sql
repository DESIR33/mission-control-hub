
-- 1. Workspace invites table
CREATE TABLE public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Members can view invites for their workspace
CREATE POLICY "Members can view workspace invites"
  ON public.workspace_invites FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Admins can create invites
CREATE POLICY "Admins can create invites"
  ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id) = 'admin');

-- Admins can delete invites
CREATE POLICY "Admins can delete invites"
  ON public.workspace_invites FOR DELETE TO authenticated
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- Admins can update invites (mark accepted)
CREATE POLICY "Admins can update invites"
  ON public.workspace_invites FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- 2. Create workspace RPC (any authenticated user)
CREATE OR REPLACE FUNCTION public.create_workspace(ws_name text, ws_slug text)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  new_ws_id uuid;
BEGIN
  INSERT INTO workspaces (name, slug)
  VALUES (ws_name, ws_slug)
  RETURNING id INTO new_ws_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, auth.uid(), 'admin');

  RETURN new_ws_id;
END;
$$;

-- 3. Accept invite RPC
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(invite_token text)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM workspace_invites
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Verify the email matches the current user
  IF inv.email != (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Invite email does not match your account';
  END IF;

  -- Add as member (ignore if already member)
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE workspace_invites SET accepted_at = now() WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$;
