import { z } from "zod";

export const insertContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().optional().default(""),
  companyId: z.string().optional(),
  roleId: z.string().optional(),
  source: z.string().optional().default(""),
  status: z.enum(["active", "inactive", "lead", "customer"]).default("lead"),
  vipTier: z.enum(["none", "silver", "gold", "platinum"]).default("none"),
  website: z.string().optional().default(""),
  socialTwitter: z.string().optional().default(""),
  socialLinkedin: z.string().optional().default(""),
  socialYoutube: z.string().optional().default(""),
  socialInstagram: z.string().optional().default(""),
  socialFacebook: z.string().optional().default(""),
  socialTelegram: z.string().optional().default(""),
  socialWhatsapp: z.string().optional().default(""),
  socialDiscord: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  country: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

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
  vip_tier: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRole {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}
