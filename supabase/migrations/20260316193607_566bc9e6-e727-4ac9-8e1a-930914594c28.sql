
-- Add video and company linking to subscriber_guides
ALTER TABLE public.subscriber_guides
  ADD COLUMN video_queue_id bigint,
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX idx_subscriber_guides_video ON public.subscriber_guides(video_queue_id);
CREATE INDEX idx_subscriber_guides_company ON public.subscriber_guides(company_id);
