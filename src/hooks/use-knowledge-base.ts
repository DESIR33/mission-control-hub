import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface KnowledgeBaseEntry {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export function useKnowledgeBase() {
  const { workspaceId } = useWorkspace();
  return useQuery<KnowledgeBaseEntry[]>({
    queryKey: ["knowledge-base", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("knowledge_base")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateKBEntry() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { title: string; content: string; category: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("knowledge_base").insert({ workspace_id: workspaceId, ...entry });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Knowledge base entry added"); qc.invalidateQueries({ queryKey: ["knowledge-base"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateKBEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content?: string; category?: string; is_active?: boolean }) => {
      const { error } = await query("knowledge_base").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entry updated"); qc.invalidateQueries({ queryKey: ["knowledge-base"] }); },
  });
}

export function useDeleteKBEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entry deleted"); qc.invalidateQueries({ queryKey: ["knowledge-base"] }); },
  });
}
