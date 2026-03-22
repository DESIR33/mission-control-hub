
-- Route actions produced by inbox classification
CREATE TABLE public.inbox_route_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id uuid NOT NULL,
  action_type text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}',
  rationale text,
  resolved_at timestamptz,
  resolved_by uuid,
  result_entity_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inbox_route_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage inbox_route_actions"
  ON public.inbox_route_actions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX idx_inbox_route_actions_ws_status ON public.inbox_route_actions(workspace_id, status);
CREATE INDEX idx_inbox_route_actions_email ON public.inbox_route_actions(email_id);

COMMENT ON COLUMN public.inbox_route_actions.action_type IS 'create_contact | update_contact | create_deal | schedule_followup | enroll_sequence';
COMMENT ON COLUMN public.inbox_route_actions.status IS 'pending | approved | executed | rejected | auto_executed';
COMMENT ON COLUMN public.inbox_route_actions.confidence IS '0-100 score; above threshold auto-executes, below goes to approval queue';
