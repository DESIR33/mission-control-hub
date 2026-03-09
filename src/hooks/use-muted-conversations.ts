import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export function useMutedConversations() {
  const { workspaceId } = useWorkspace();
  return useQuery<{ conversation_id: string | null; from_email: string | null }[]>({
    queryKey: ["muted-conversations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("muted_conversations")
        .select("conversation_id, from_email")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useMuteConversation() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, fromEmail }: { conversationId?: string; fromEmail?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("muted_conversations").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId || null,
        from_email: fromEmail || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Conversation muted"); qc.invalidateQueries({ queryKey: ["muted-conversations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnmuteConversation() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, fromEmail }: { conversationId?: string; fromEmail?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      let q = query("muted_conversations").delete().eq("workspace_id", workspaceId);
      if (conversationId) q = q.eq("conversation_id", conversationId);
      else if (fromEmail) q = q.eq("from_email", fromEmail);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Conversation unmuted"); qc.invalidateQueries({ queryKey: ["muted-conversations"] }); },
  });
}
