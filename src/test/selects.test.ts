import { describe, it, expect } from "vitest";
import {
  CONTACT_EMBED_FIELDS,
  CONTACT_ID_ONLY,
  COMPANY_EMBED_FIELDS,
  ACTIVITY_FIELDS,
} from "@/integrations/supabase/selects";

describe("supabase select fragments", () => {
  it("CONTACT_ID_ONLY is just the id (keeps payload minimal for count-only usage)", () => {
    expect(CONTACT_ID_ONLY).toBe("id");
  });

  it("CONTACT_EMBED_FIELDS covers list/table essentials only", () => {
    const fields = CONTACT_EMBED_FIELDS.split(",").map((s) => s.trim());
    expect(fields).toEqual(["id", "first_name", "last_name", "email", "role", "status"]);
  });

  it("COMPANY_EMBED_FIELDS covers list/table essentials only", () => {
    const fields = COMPANY_EMBED_FIELDS.split(",").map((s) => s.trim());
    expect(fields).toEqual(["id", "name", "logo_url", "industry"]);
  });

  it("ACTIVITY_FIELDS includes the workspace + performed_* columns needed by the timeline", () => {
    expect(ACTIVITY_FIELDS).toContain("workspace_id");
    expect(ACTIVITY_FIELDS).toContain("performed_at");
    expect(ACTIVITY_FIELDS).toContain("performed_by");
    expect(ACTIVITY_FIELDS).toContain("entity_id");
    expect(ACTIVITY_FIELDS).toContain("activity_type");
  });
});
