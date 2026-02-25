export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive' | 'lead' | 'customer';
  role: string | null;
  source: string | null;
  company_id: string | null;
  owner_id: string | null;
  escalation_owner_id: string | null;
  vip_tier: 'none' | 'silver' | 'gold' | 'platinum';
  response_sla_minutes: number | null;
  preferred_channel: 'email' | 'phone' | 'sms' | 'slack';
  website: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_telegram: string | null;
  social_whatsapp: string | null;
  enrichment_hunter: Record<string, unknown> | null;
  enrichment_ai: Record<string, unknown> | null;
  enrichment_youtube: Record<string, unknown> | null;
  custom_fields: Record<string, unknown>;
  last_contact_date: string | null;
  avatar_url: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company | null;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  size: string | null;
  revenue: string | null;
  location: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  vip_tier: 'none' | 'silver' | 'gold' | 'platinum';
  notes: string | null;
  last_contact_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  workspace_id: string;
  entity_id: string;
  entity_type: 'contact' | 'company' | 'deal';
  activity_type: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  performed_by: string | null;
  performed_at: string;
  created_at: string;
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export type ContactStatus = 'active' | 'inactive' | 'lead' | 'customer';
export type VipTier = 'none' | 'silver' | 'gold' | 'platinum';
