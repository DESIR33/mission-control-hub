import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AutoLabel {
  id: string;
  workspace_id: string;
  label_name: string;
  description: string;
  natural_language_rule: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export function useAutoLabels() {
  const { workspaceId } = useWorkspace();
  return useQuery<AutoLabel[]>({
    queryKey: ["auto-labels", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("email_auto_labels")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateAutoLabel() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: { label_name: string; description: string; natural_language_rule: string; color: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("email_auto_labels").insert({ workspace_id: workspaceId, ...label });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Auto label created"); qc.invalidateQueries({ queryKey: ["auto-labels"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAutoLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("email_auto_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Label deleted"); qc.invalidateQueries({ queryKey: ["auto-labels"] }); },
  });
}

export function useToggleAutoLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await query("email_auto_labels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auto-labels"] }),
  });
}
