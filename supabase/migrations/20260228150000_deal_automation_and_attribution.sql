-- ============================================
-- DEAL PIPELINE AUTOMATION (Feature 8)
-- Stage-change triggers for notifications, activities, and status updates
-- ============================================

-- Add video_queue_id to deals for content-to-revenue attribution (Feature 6)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'video_queue_id'
  ) THEN
    ALTER TABLE public.deals ADD COLUMN video_queue_id UUID REFERENCES public.video_queue(id) ON DELETE SET NULL;
    CREATE INDEX idx_deals_video_queue ON public.deals(video_queue_id);
  END IF;
END $$;

-- Add video_queue_id to affiliate_transactions for attribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'affiliate_transactions' AND column_name = 'video_queue_id'
  ) THEN
    ALTER TABLE public.affiliate_transactions ADD COLUMN video_queue_id UUID REFERENCES public.video_queue(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create trigger function for deal stage changes
CREATE OR REPLACE FUNCTION public.handle_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when stage actually changes
  IF OLD.stage = NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Log activity for every stage change
  INSERT INTO public.activities (
    workspace_id, entity_id, entity_type, activity_type,
    title, description, performed_at
  ) VALUES (
    NEW.workspace_id, NEW.id, 'deal', 'stage_change',
    'Deal stage changed: ' || OLD.stage || ' → ' || NEW.stage,
    'Deal "' || NEW.title || '" moved from ' || OLD.stage || ' to ' || NEW.stage,
    now()
  );

  -- When entering negotiation: create notification
  IF NEW.stage = 'negotiation' THEN
    INSERT INTO public.notifications (
      workspace_id, type, title, body, entity_type, entity_id
    ) VALUES (
      NEW.workspace_id, 'deal_change',
      'Deal entering negotiation: ' || NEW.title,
      'Consider scheduling a follow-up call. Deal value: $' || COALESCE(NEW.value::text, '0'),
      'deal', NEW.id
    );
  END IF;

  -- When closed_won: set closed_at, update contact status
  IF NEW.stage = 'closed_won' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());

    INSERT INTO public.notifications (
      workspace_id, type, title, body, entity_type, entity_id
    ) VALUES (
      NEW.workspace_id, 'deal_change',
      'Deal won: ' || NEW.title || ' 🎉',
      'Congratulations! Deal value: $' || COALESCE(NEW.value::text, '0'),
      'deal', NEW.id
    );

    -- Update contact to customer
    IF NEW.contact_id IS NOT NULL THEN
      UPDATE public.contacts
      SET status = 'customer', last_contact_date = now()
      WHERE id = NEW.contact_id AND workspace_id = NEW.workspace_id;
    END IF;
  END IF;

  -- When closed_lost: set closed_at
  IF NEW.stage = 'closed_lost' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());

    INSERT INTO public.notifications (
      workspace_id, type, title, body, entity_type, entity_id
    ) VALUES (
      NEW.workspace_id, 'deal_change',
      'Deal lost: ' || NEW.title,
      'Deal has been marked as closed lost.',
      'deal', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_deal_stage_change ON public.deals;
CREATE TRIGGER trg_deal_stage_change
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deal_stage_change();
