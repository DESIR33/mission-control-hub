import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export function useCreateContactFromEmail() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { from_name: string; from_email: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const nameParts = data.from_name.trim().split(/\s+/);
      const firstName = nameParts[0] || data.from_email.split("@")[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
      
      // Check duplicate
      const { data: existing } = await supabase.from("contacts").select("id").eq("workspace_id", workspaceId).eq("email", data.from_email).maybeSingle();
      if (existing) throw new Error("Contact with this email already exists");

      const { error } = await supabase.from("contacts").insert({
        workspace_id: workspaceId,
        first_name: firstName,
        last_name: lastName,
        email: data.from_email,
        source: "email",
        status: "lead",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contact created from email"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateCompanyFromEmail() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { from_email: string; from_name?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const domain = data.from_email.split("@")[1];
      if (!domain) throw new Error("Invalid email");
      const companyName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
      
      // Check duplicate
      const { data: existing } = await supabase.from("companies").select("id").eq("workspace_id", workspaceId).eq("website", `https://${domain}`).maybeSingle();
      if (existing) throw new Error("Company with this domain already exists");

      const { error } = await supabase.from("companies").insert({
        workspace_id: workspaceId,
        name: companyName,
        website: `https://${domain}`,
        primary_email: data.from_email,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company created from email"); qc.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
