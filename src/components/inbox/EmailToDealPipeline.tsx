import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import {
  DollarSign, Loader2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface Props {
  email: SmartEmail;
}

export function EmailToDealPipeline({ email }: Props) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const createDeal = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      // Extract deal info from email
      const domain = email.from_email.split("@")[1];
      const companyName = domain ? domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1) : "Unknown";

      // Find or create company
      let companyId: string | null = null;
      if (domain) {
        const { data: existing } = await supabase.from("companies")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("website", `https://${domain}`)
          .maybeSingle();

        if (existing) {
          companyId = existing.id;
        } else {
          const { data: newCo } = await supabase.from("companies")
            .insert({ workspace_id: workspaceId, name: companyName, website: `https://${domain}`, primary_email: email.from_email })
            .select("id")
            .single();
          companyId = newCo?.id || null;
        }
      }

      // Find or create contact
      let contactId: string | null = null;
      const { data: existingContact } = await supabase.from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", email.from_email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const nameParts = (email.from_name || "").trim().split(/\s+/);
        const { data: newContact } = await supabase.from("contacts")
          .insert({
            workspace_id: workspaceId,
            first_name: nameParts[0] || email.from_email.split("@")[0],
            last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
            email: email.from_email,
            company_id: companyId,
            source: "email",
          })
          .select("id")
          .single();
        contactId = newContact?.id || null;
      }

      // Create deal
      const dealTitle = `${companyName} — ${email.subject || "Email Opportunity"}`;
      const { error } = await supabase.from("deals").insert({
        workspace_id: workspaceId,
        title: dealTitle,
        company_id: companyId,
        contact_id: contactId,
        stage: "prospecting",
        notes: `Created from email: "${email.subject}"\nFrom: ${email.from_name} <${email.from_email}>\n\nPreview: ${email.preview}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deal created from email with company & contact");
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2 overflow-hidden"
      onClick={() => createDeal.mutate()}
      disabled={createDeal.isPending}
    >
      {createDeal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <DollarSign className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">Create Deal from Email</span>
      <ArrowRight className="w-3 h-3 ml-auto shrink-0" />
    </Button>
  );
}
