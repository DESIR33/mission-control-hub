
-- ============================================
-- 1. WORKSPACES
-- ============================================
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. WORKSPACE MEMBERS
-- ============================================
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','operator','contributor','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- 4. CONTACTS
-- ============================================
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('active','inactive','lead','customer')),
  role TEXT,
  source TEXT,
  company_id UUID,
  owner_id UUID,
  escalation_owner_id UUID,
  vip_tier TEXT DEFAULT 'none' CHECK (vip_tier IN ('none','silver','gold','platinum')),
  response_sla_minutes INT,
  preferred_channel TEXT DEFAULT 'email' CHECK (preferred_channel IN ('email','phone','sms','slack')),
  website TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_telegram TEXT,
  social_whatsapp TEXT,
  enrichment_hunter JSONB,
  enrichment_ai JSONB,
  enrichment_youtube JSONB,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  last_contact_date TIMESTAMPTZ,
  avatar_url TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX idx_contacts_status ON public.contacts(workspace_id, status);
CREATE INDEX idx_contacts_deleted ON public.contacts(workspace_id, deleted_at);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);

-- ============================================
-- 5. COMPANIES
-- ============================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  website TEXT,
  description TEXT,
  size TEXT,
  revenue TEXT,
  location TEXT,
  primary_email TEXT,
  secondary_email TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_tiktok TEXT,
  social_producthunt TEXT,
  vip_tier TEXT DEFAULT 'none' CHECK (vip_tier IN ('none','silver','gold','platinum')),
  response_sla_minutes INT,
  enrichment_brandfetch JSONB,
  enrichment_clay JSONB,
  enrichment_firecrawl JSONB,
  notes TEXT,
  last_contact_date TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_workspace ON public.companies(workspace_id);

-- Add FK from contacts to companies
ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- ============================================
-- 6. TAGS & ENTITY_TAGS
-- ============================================
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE public.entity_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact','company','deal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_id, entity_type)
);

CREATE INDEX idx_entity_tags_entity ON public.entity_tags(entity_id, entity_type);

-- ============================================
-- 7. ACTIVITIES
-- ============================================
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact','company','deal')),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('meeting','email','call','note','linkedin','twitter','instagram','post_engagement','message','deal_stage_change','task_completed','other')),
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_entity ON public.activities(entity_id, entity_type);
CREATE INDEX idx_activities_workspace ON public.activities(workspace_id);
CREATE INDEX idx_activities_performed ON public.activities(performed_at DESC);

-- ============================================
-- 8. DEALS
-- ============================================
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  stage TEXT NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting','qualification','proposal','negotiation','closed_won','closed_lost')),
  forecast_category TEXT DEFAULT 'pipeline' CHECK (forecast_category IN ('pipeline','best_case','commit','closed')),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id UUID,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_workspace ON public.deals(workspace_id);
CREATE INDEX idx_deals_stage ON public.deals(workspace_id, stage);

-- ============================================
-- 9. HELPER FUNCTION: workspace membership check
-- ============================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================
-- 10. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 11. RLS POLICIES
-- ============================================

-- PROFILES: users can read/update their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- WORKSPACES: members can read
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id));
CREATE POLICY "Admins can update workspace" ON public.workspaces FOR UPDATE USING (public.get_workspace_role(id) = 'admin');
CREATE POLICY "Authenticated users can create workspace" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- WORKSPACE_MEMBERS: members can see co-members, admins can manage
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert members" ON public.workspace_members FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) = 'admin' OR
  -- Allow the workspace creator to add themselves
  (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id))
);
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

-- CONTACTS: workspace members (non-deleted)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view contacts" ON public.contacts FOR SELECT USING (public.is_workspace_member(workspace_id) AND deleted_at IS NULL);
CREATE POLICY "Operators+ can insert contacts" ON public.contacts FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Operators+ can update contacts" ON public.contacts FOR UPDATE USING (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE USING (
  public.get_workspace_role(workspace_id) = 'admin'
);

-- COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view companies" ON public.companies FOR SELECT USING (public.is_workspace_member(workspace_id) AND deleted_at IS NULL);
CREATE POLICY "Operators+ can insert companies" ON public.companies FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Operators+ can update companies" ON public.companies FOR UPDATE USING (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Admins can delete companies" ON public.companies FOR DELETE USING (
  public.get_workspace_role(workspace_id) = 'admin'
);

-- TAGS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tags" ON public.tags FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can manage tags" ON public.tags FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Operators+ can delete tags" ON public.tags FOR DELETE USING (
  public.get_workspace_role(workspace_id) IN ('admin','operator')
);

-- ENTITY_TAGS: access via tag's workspace
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view entity_tags" ON public.entity_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND public.is_workspace_member(t.workspace_id))
);
CREATE POLICY "Operators+ can manage entity_tags" ON public.entity_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND public.get_workspace_role(t.workspace_id) IN ('admin','operator','contributor'))
);
CREATE POLICY "Operators+ can delete entity_tags" ON public.entity_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tag_id AND public.get_workspace_role(t.workspace_id) IN ('admin','operator'))
);

-- ACTIVITIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view activities" ON public.activities FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert activities" ON public.activities FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);

-- DEALS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view deals" ON public.deals FOR SELECT USING (public.is_workspace_member(workspace_id) AND deleted_at IS NULL);
CREATE POLICY "Operators+ can insert deals" ON public.deals FOR INSERT WITH CHECK (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Operators+ can update deals" ON public.deals FOR UPDATE USING (
  public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
);
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE USING (
  public.get_workspace_role(workspace_id) = 'admin'
);

-- ============================================
-- 12. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
