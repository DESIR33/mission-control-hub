import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface SharedDraft {
  id: string;
  workspace_id: string;
  email_id: string | null;
  created_by: string;
  to_email: string;
  subject: string;
  body_html: string;
  status: string;
  shared_with: string[];
  created_at: string;
  updated_at: string;
}

export function useSharedDrafts() {
  const { workspaceId } = useWorkspace();
  return useQuery<SharedDraft[]>({
    queryKey: ["shared-drafts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("shared_drafts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSharedDraft() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: { email_id?: string; to_email: string; subject: string; body_html: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await query("shared_drafts").insert({
        workspace_id: workspaceId,
        created_by: user.id,
        ...draft,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Draft shared with team"); qc.invalidateQueries({ queryKey: ["shared-drafts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSharedDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; body_html?: string; subject?: string; status?: string }) => {
      const { error } = await query("shared_drafts").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shared-drafts"] }),
  });
}
