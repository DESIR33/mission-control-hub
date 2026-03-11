
CREATE TABLE public.deal_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, youtube_video_id)
);

ALTER TABLE public.deal_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view deal videos" ON public.deal_videos FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert deal videos" ON public.deal_videos FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete deal videos" ON public.deal_videos FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE INDEX idx_deal_videos_deal ON public.deal_videos(deal_id);
CREATE INDEX idx_deal_videos_video ON public.deal_videos(youtube_video_id, workspace_id);
