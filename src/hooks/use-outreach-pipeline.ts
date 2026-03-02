import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export function useAddToPipeline() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyName: string;
      contactFirstName: string;
      contactLastName?: string;
      contactEmail?: string;
      website?: string;
      industry?: string;
      dealValue?: number;
      sequenceId?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Create company
      const { data: company, error: compError } = await supabase
        .from("companies")
        .insert({
          workspace_id: workspaceId,
          name: input.companyName,
          website: input.website || null,
          industry: input.industry || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (compError) throw compError;

      // 2. Create contact
      const { data: contact, error: contError } = await supabase
        .from("contacts")
        .insert({
          workspace_id: workspaceId,
          first_name: input.contactFirstName,
          last_name: input.contactLastName || null,
          email: input.contactEmail || null,
          company_id: company.id,
          status: "lead",
          source: "sponsor_discovery",
          created_by: user?.id,
        })
        .select()
        .single();
      if (contError) throw contError;

      // 3. Create deal
      const { data: deal, error: dealError } = await supabase
        .from("deals")
        .insert({
          workspace_id: workspaceId,
          title: `${input.companyName} Sponsorship`,
          value: input.dealValue || null,
          stage: "prospecting",
          contact_id: contact.id,
          company_id: company.id,
          created_by: user?.id,
        })
        .select()
        .single();
      if (dealError) throw dealError;

      // 4. Enroll in sequence if provided
      if (input.sequenceId) {
        await supabase.from("email_sequence_enrollments" as any).insert({
          workspace_id: workspaceId,
          sequence_id: input.sequenceId,
          contact_id: contact.id,
          deal_id: deal.id,
          current_step: 0,
          status: "active",
          next_send_at: new Date().toISOString(),
        } as any);
      }

      return { company, contact, deal };
    },
    onSuccess: () => {
      toast.success("Added to outreach pipeline!");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });
}
