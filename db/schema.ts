import { z } from "zod";

export const insertContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Invalid email").nullable().optional(),
  companyId: z.string().optional(),
  roleId: z.string().optional(),
  status: z.enum(["active", "inactive", "lead", "customer"]).default("lead"),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  country: z.string().optional().default(""),
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
