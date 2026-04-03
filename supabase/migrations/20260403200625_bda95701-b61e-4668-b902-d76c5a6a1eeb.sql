-- 1. Add new columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'sponsor_lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_decision_maker boolean DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reports_to text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_outreach_date timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_response_date timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_follow_up_date date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS outreach_count integer DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS typical_budget_range text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_deal_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS warmth text DEFAULT 'cold';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS secondary_email text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_source text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_detail text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS social_github text;

-- 2. Expand contact_roles with default rows
INSERT INTO contact_roles (workspace_id, name)
SELECT cr.workspace_id, role_name
FROM contact_roles cr
CROSS JOIN unnest(ARRAY[
  'CTO', 'COO', 'CMO',
  'Head of Marketing', 'Head of Partnerships', 'Head of Growth',
  'Marketing Manager', 'Partnerships Manager', 'DevRel', 'DevRel Manager',
  'Growth Lead', 'Content Manager', 'Community Manager',
  'Agency Rep', 'Account Manager', 'Business Development'
]) AS role_name
WHERE cr.name = 'Founder'
ON CONFLICT DO NOTHING;

-- 3. Link inbox_emails to contacts
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_contact_id ON inbox_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_from_email ON inbox_emails(from_email);

-- Backfill existing email matches
UPDATE inbox_emails e
SET contact_id = c.id
FROM contacts c
WHERE e.contact_id IS NULL
  AND c.email IS NOT NULL
  AND lower(e.from_email) = lower(c.email)
  AND c.deleted_at IS NULL;

-- 4. Create contact_interactions table
CREATE TABLE IF NOT EXISTS contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  subject text,
  notes text,
  email_id uuid,
  deal_id uuid REFERENCES deals(id),
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact interactions" ON contact_interactions FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert contact interactions" ON contact_interactions FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update contact interactions" ON contact_interactions FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete contact interactions" ON contact_interactions FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact ON contact_interactions(contact_id, interaction_date DESC);

-- 5. Create contact_tags table
CREATE TABLE IF NOT EXISTS contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, contact_id, tag)
);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact tags" ON contact_tags FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert contact tags" ON contact_tags FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update contact tags" ON contact_tags FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete contact tags" ON contact_tags FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

-- 6. Auto-update trigger for contact dates from interactions
CREATE OR REPLACE FUNCTION update_contact_from_interaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'outbound' THEN
    UPDATE contacts SET
      last_outreach_date = NEW.interaction_date,
      outreach_count = COALESCE(outreach_count, 0) + 1,
      updated_at = now()
    WHERE id = NEW.contact_id;
  ELSIF NEW.direction = 'inbound' THEN
    UPDATE contacts SET
      last_response_date = NEW.interaction_date,
      last_contact_date = NEW.interaction_date,
      updated_at = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_contact_interaction_update
AFTER INSERT ON contact_interactions
FOR EACH ROW EXECUTE FUNCTION update_contact_from_interaction();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_warmth ON contacts(warmth);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up ON contacts(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score);