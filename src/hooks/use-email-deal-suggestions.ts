import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface EmailDealSuggestion {
  id: string;
  workspace_id: string;
  email_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  suggestion_type: "link_deal" | "create_deal" | "update_stage";
  suggested_stage: string | null;
  suggested_value: number | null;
  confidence: number;
  context_snippet: string | null;
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
  actioned_at: string | null;
}

export function useEmailDealSuggestions() {
  const { workspaceId } = useWorkspace();
  return useQuery<EmailDealSuggestion[]>({
    queryKey: ["email-deal-suggestions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("email_deal_suggestions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .order("confidence", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as EmailDealSuggestion[];
    },
    enabled: !!workspaceId,
  });
}

export function useActionDealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "dismissed" }) => {
      const { error } = await query("email_deal_suggestions")
        .update({ status, actioned_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "accepted" ? "Deal suggestion accepted" : "Suggestion dismissed");
      qc.invalidateQueries({ queryKey: ["email-deal-suggestions"] });
    },
  });
}
