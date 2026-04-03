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
  social_discord?: string | null;
  role_id?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
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
  country: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_producthunt: string | null;
  social_whatsapp: string | null;
  social_crunchbase?: string | null;
  social_github?: string | null;
  social_discord?: string | null;
  vip_tier: 'none' | 'silver' | 'gold' | 'platinum';
  response_sla_minutes: number | null;
  enrichment_brandfetch: Record<string, unknown> | null;
  enrichment_clay: Record<string, unknown> | null;
  enrichment_firecrawl: Record<string, unknown> | null;
  notes: string | null;
  last_contact_date: string | null;
  is_agency: boolean;
  funding_stage: string | null;
  total_funding: number | null;
  last_funding_date: string | null;
  founded_year: number | null;
  founder_names: string | null;
  pricing_model: string | null;
  tech_stack: string | null;
  outreach_status: string | null;
  sponsor_fit_score: number | null;
  competitor_group: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contacts?: Contact[];
}

export interface FundingRound {
  id: string;
  workspace_id: string;
  company_id: string;
  round_type: string;
  amount: number | null;
  valuation_pre: number | null;
  valuation_post: number | null;
  date: string | null;
  lead_investor: string | null;
  other_investors: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyPerson {
  id: string;
  workspace_id: string;
  company_id: string;
  name: string;
  role: string | null;
  is_founder: boolean;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  notes: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyPricing {
  id: string;
  workspace_id: string;
  company_id: string;
  tier_name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: string | null;
  is_most_popular: boolean;
  sort_order: number;
  last_verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyRelationship {
  id: string;
  workspace_id: string;
  company_a_id: string;
  company_b_id: string;
  relationship_type: string;
  notes: string | null;
  created_at: string;
  company_a?: Company;
  company_b?: Company;
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

export type DealStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: DealStage;
  forecast_category: string | null;
  contact_id: string | null;
  company_id: string | null;
  owner_id: string | null;
  expected_close_date: string | null;
  closed_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact | null;
  company?: Company | null;
}

export type ContactStatus = 'active' | 'inactive' | 'lead' | 'customer';
export type VipTier = 'none' | 'silver' | 'gold' | 'platinum';
