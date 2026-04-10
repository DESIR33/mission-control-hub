
-- Memory pipeline configuration table
CREATE TABLE public.memory_pipeline_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, pipeline_key)
);

ALTER TABLE public.memory_pipeline_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage pipeline config"
  ON public.memory_pipeline_config FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TRIGGER update_memory_pipeline_config_updated_at
  BEFORE UPDATE ON public.memory_pipeline_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default pipeline configs for existing workspaces
INSERT INTO public.memory_pipeline_config (workspace_id, pipeline_key, enabled, config)
SELECT w.id, cfg.key, true, cfg.val
FROM public.workspaces w
CROSS JOIN (VALUES
  ('deal_stage_change', '{"stages": ["closed_won", "closed_lost"], "min_value": 0}'::jsonb),
  ('video_performance', '{"min_views_percentile": 90, "min_ctr": 8.0}'::jsonb),
  ('email_important', '{"min_priority": "P1"}'::jsonb),
  ('agent_execution', '{"min_proposals": 1}'::jsonb)
) AS cfg(key, val)
ON CONFLICT (workspace_id, pipeline_key) DO NOTHING;

-- Function to trigger auto-memory-extractor via pg_net
CREATE OR REPLACE FUNCTION public.trigger_auto_memory_extractor(
  p_workspace_id UUID,
  p_event_type TEXT,
  p_event_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pipeline_enabled BOOLEAN;
BEGIN
  -- Check if this pipeline is enabled
  SELECT enabled INTO pipeline_enabled
  FROM memory_pipeline_config
  WHERE workspace_id = p_workspace_id AND pipeline_key = p_event_type;

  IF pipeline_enabled IS NULL OR pipeline_enabled = false THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/auto-memory-extractor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI'
    ),
    body := jsonb_build_object(
      'workspace_id', p_workspace_id,
      'event_type', p_event_type,
      'event_data', p_event_data
    )
  );
END;
$$;

-- Trigger on deal stage changes
CREATE OR REPLACE FUNCTION public.on_deal_stage_change_memory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    PERFORM trigger_auto_memory_extractor(
      NEW.workspace_id,
      'deal_stage_change',
      jsonb_build_object(
        'deal_id', NEW.id,
        'deal_title', NEW.title,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'value', NEW.value,
        'company_id', NEW.company_id,
        'contact_id', NEW.contact_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deal_stage_change_memory
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.on_deal_stage_change_memory();

-- Trigger on agent execution completion
CREATE OR REPLACE FUNCTION public.on_agent_execution_complete_memory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM trigger_auto_memory_extractor(
      NEW.workspace_id,
      'agent_execution',
      jsonb_build_object(
        'execution_id', NEW.id,
        'agent_slug', NEW.agent_slug,
        'skill_slug', NEW.skill_slug,
        'proposals_created', NEW.proposals_created,
        'duration_ms', NEW.duration_ms,
        'input', NEW.input,
        'output', NEW.output
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_execution_complete_memory
  AFTER UPDATE ON public.agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_agent_execution_complete_memory();
