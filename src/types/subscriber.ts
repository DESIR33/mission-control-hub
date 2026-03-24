export type SubscriberStatus = 'active' | 'inactive' | 'unsubscribed' | 'bounced';
export type SubscriberSource = 'website' | 'youtube' | 'manual' | 'import' | 'beehiiv';

export interface Subscriber {
  id: string;
  workspace_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: SubscriberStatus;
  source: SubscriberSource | null;
  source_video_id: string | null;
  source_video_title: string | null;
  guide_requested: string | null;
  guide_delivered_at: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  engagement_score: number;
  engagement_data: SubscriberEngagementData;
  opt_in_confirmed: boolean;
  opt_in_confirmed_at: string | null;
  promoted_to_contact_id: string | null;
  page_url: string | null;
  referrer: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Beehiiv fields
  beehiiv_id?: string | null;
  beehiiv_status?: string | null;
  beehiiv_tier?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  // Joined
  tags?: SubscriberTag[];
}

export interface SubscriberEngagementData {
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  total_opens?: number;
  total_clicks?: number;
  unique_opens?: number;
  unique_clicks?: number;
  open_rate?: number;
  click_rate?: number;
  guides_downloaded: number;
  last_email_opened_at: string | null;
  last_clicked_at: string | null;
}

export interface SubscriberTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  auto_rule: Record<string, unknown> | null;
  created_at: string;
}

export interface SubscriberGuide {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  delivery_type: 'email' | 'redirect';
  file_url: string | null;
  email_subject: string | null;
  email_body: string | null;
  download_count: number;
  status: 'active' | 'inactive';
  video_queue_id: number | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  video_title?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
}

export interface SubscriberVideoNotification {
  id: string;
  workspace_id: string;
  video_id: string;
  video_title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  email_subject: string | null;
  email_body: string | null;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface SubscriberNotificationLog {
  id: string;
  notification_id: string;
  subscriber_id: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface SubscriberSequenceStep {
  step_number: number;
  delay_days: number;
  subject: string;
  body: string;
}

export type SubscriberSequenceTrigger = 'manual' | 'on_subscribe' | 'on_guide_download' | 'on_tag';

export interface SubscriberSequence {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_type: SubscriberSequenceTrigger;
  trigger_config: Record<string, unknown>;
  steps: SubscriberSequenceStep[];
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface SubscriberSequenceEnrollment {
  id: string;
  sequence_id: string;
  subscriber_id: string;
  current_step: number;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed';
  enrolled_at: string;
  next_send_at: string | null;
  completed_at: string | null;
}

export interface SubscriberEngagementEvent {
  id: string;
  workspace_id: string;
  subscriber_id: string;
  event_type: 'email_open' | 'email_click' | 'guide_download' | 'video_notification_click' | 'sequence_complete';
  metadata: Record<string, unknown>;
  created_at: string;
}

export type EngagementTier = 'hot' | 'warm' | 'cool' | 'cold';

export function getEngagementTier(score: number): EngagementTier {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}
