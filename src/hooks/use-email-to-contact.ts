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
    mutationFn: async (data: {
      from_email: string;
      from_name?: string;
      subject?: string;
      body_text?: string;
      force?: boolean;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const domain = data.from_email.split("@")[1];
      if (!domain) throw new Error("Invalid email");

      // Check for existing company by domain (pre-check for quick duplicate detection)
      if (!data.force) {
        const { data: existingByWebsite } = await supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .eq("website", `https://${domain}`)
          .maybeSingle();

        if (existingByWebsite) {
          const dupInfo: DuplicateInfo = {
            type: "company",
            existingId: existingByWebsite.id,
            existingName: existingByWebsite.name,
          };
          throw Object.assign(new Error("DUPLICATE"), { duplicate: dupInfo });
        }
      }

      // Call AI extraction edge function
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "extract-company-from-email",
        {
          body: {
            workspace_id: workspaceId,
            from_email: data.from_email,
            from_name: data.from_name || "",
            subject: data.subject || "",
            body_text: data.body_text || "",
          },
        }
      );

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      return result as {
        extraction: Record<string, unknown>;
        created: string[];
        company_id?: string;
        company_action?: string;
        client_company_id?: string;
        agency_company_id?: string;
        client_action?: string;
        agency_action?: string;
        link_action?: string;
      };
    },
    onSuccess: (result) => {
      const isAgency = result.extraction?.is_agency === true;
      const created = result.created || [];

      if (isAgency) {
        const agencyName = result.extraction?.agency_name as string;
        const clientName = result.extraction?.client_company_name as string;
        const parts: string[] = [];
        if (result.agency_action === "created") parts.push(`Agency "${agencyName}" created`);
        else parts.push(`Agency "${agencyName}" found`);
        if (result.client_action === "created") parts.push(`client "${clientName}" created`);
        else parts.push(`client "${clientName}" found`);
        if (result.link_action === "created") parts.push("linked together");
        toast.success(parts.join(", "));
      } else if (result.company_action === "updated") {
        toast.success("Existing company updated with AI-extracted info");
      } else if (created.length > 0) {
        toast.success(`Company "${created[0]}" created with AI-extracted details`);
      } else {
        toast.success("Company processed");
      }

      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["agency-links"] });
    },
    onError: (e: any) => {
      if (e.duplicate) return;
      toast.error(e.message);
    },
  });
}
