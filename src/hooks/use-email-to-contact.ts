import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface DuplicateInfo {
  type: "contact" | "company";
  existingId: string;
  existingName: string;
}

export function useCreateContactFromEmail() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { from_name: string; from_email: string; force?: boolean }) => {
      if (!workspaceId) throw new Error("No workspace");
      const nameParts = data.from_name.trim().split(/\s+/);
      const firstName = nameParts[0] || data.from_email.split("@")[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      // Check duplicate
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("workspace_id", workspaceId)
        .eq("email", data.from_email)
        .maybeSingle();

      if (existing && !data.force) {
        const dupInfo: DuplicateInfo = {
          type: "contact",
          existingId: existing.id,
          existingName: `${existing.first_name} ${existing.last_name ?? ""}`.trim(),
        };
        throw Object.assign(new Error("DUPLICATE"), { duplicate: dupInfo });
      }

      if (existing && data.force) {
        // Update existing contact instead
        const { error } = await supabase
          .from("contacts")
          .update({
            first_name: firstName,
            last_name: lastName,
            source: "email",
          })
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "updated" as const, id: existing.id };
      }

      // Try to find matching company by email domain
      const domain = data.from_email.split("@")[1];
      let companyId: string | null = null;
      if (domain) {
        const { data: matchedCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("website", `https://${domain}`)
          .maybeSingle();

        if (!matchedCompany) {
          // Also try matching by primary_email domain
          const { data: matchByEmail } = await supabase
            .from("companies")
            .select("id, primary_email")
            .eq("workspace_id", workspaceId)
            .not("primary_email", "is", null);

          if (matchByEmail) {
            const match = matchByEmail.find(
              (c) => c.primary_email && c.primary_email.split("@")[1] === domain
            );
            if (match) companyId = match.id;
          }
        } else {
          companyId = matchedCompany.id;
        }
      }

      const { error } = await supabase.from("contacts").insert({
        workspace_id: workspaceId,
        first_name: firstName,
        last_name: lastName,
        email: data.from_email,
        company_id: companyId,
        source: "email",
        status: "lead",
      });
      if (error) throw error;
      return { action: "created" as const, companyLinked: !!companyId };
    },
    onSuccess: (result) => {
      if (result?.action === "updated") {
        toast.success("Existing contact updated");
      } else if (result?.companyLinked) {
        toast.success("Contact created and linked to existing company");
      } else {
        toast.success("Contact created from email");
      }
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e: any) => {
      if (e.duplicate) return; // handled by UI
      toast.error(e.message);
    },
  });
}

export function useCreateCompanyFromEmail() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { from_email: string; from_name?: string; force?: boolean }) => {
      if (!workspaceId) throw new Error("No workspace");
      const domain = data.from_email.split("@")[1];
      if (!domain) throw new Error("Invalid email");
      const companyName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

      // Check duplicate by website
      const { data: existingByWebsite } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .eq("website", `https://${domain}`)
        .maybeSingle();

      // Also check by primary_email domain
      let existingByEmail: { id: string; name: string } | null = null;
      if (!existingByWebsite) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name, primary_email")
          .eq("workspace_id", workspaceId)
          .not("primary_email", "is", null);

        if (companies) {
          const match = companies.find(
            (c) => c.primary_email && c.primary_email.split("@")[1] === domain
          );
          if (match) existingByEmail = { id: match.id, name: match.name };
        }
      }

      const existing = existingByWebsite || existingByEmail;

      if (existing && !data.force) {
        const dupInfo: DuplicateInfo = {
          type: "company",
          existingId: existing.id,
          existingName: existing.name,
        };
        throw Object.assign(new Error("DUPLICATE"), { duplicate: dupInfo });
      }

      if (existing && data.force) {
        const { error } = await supabase
          .from("companies")
          .update({
            primary_email: data.from_email,
          })
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "updated" as const };
      }

      const { error } = await supabase.from("companies").insert({
        workspace_id: workspaceId,
        name: companyName,
        website: `https://${domain}`,
        primary_email: data.from_email,
      });
      if (error) throw error;
      return { action: "created" as const };
    },
    onSuccess: (result) => {
      if (result?.action === "updated") {
        toast.success("Existing company updated");
      } else {
        toast.success("Company created from email");
      }
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: any) => {
      if (e.duplicate) return; // handled by UI
      toast.error(e.message);
    },
  });
}
