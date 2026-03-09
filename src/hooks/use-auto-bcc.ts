import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AutoBccRule {
  id: string;
  workspace_id: string;
  bcc_email: string;
  condition_type: string;
  condition_value: string | null;
  is_active: boolean;
  created_at: string;
}

export function useAutoBccRules() {
  const { workspaceId } = useWorkspace();
  return useQuery<AutoBccRule[]>({
    queryKey: ["auto-bcc-rules", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("auto_bcc_rules")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateAutoBccRule() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: { bcc_email: string; condition_type: string; condition_value?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("auto_bcc_rules").insert({ workspace_id: workspaceId, ...rule });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Auto BCC rule created"); qc.invalidateQueries({ queryKey: ["auto-bcc-rules"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAutoBccRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("auto_bcc_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rule deleted"); qc.invalidateQueries({ queryKey: ["auto-bcc-rules"] }); },
  });
}
