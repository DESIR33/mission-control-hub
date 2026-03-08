import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const q = (table: string) => (supabase as any).from(table);

export interface CollaborationThread {
  id: string;
  workspace_id: string;
  title: string;
  status: string;
  created_at: string;
  messages?: CollaborationMessage[];
}

export interface CollaborationMessage {
  id: string;
  thread_id: string;
  agent_slug: string;
  content: string;
  handoff_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useCollaborationThreads() {
  const { workspaceId } = useWorkspace();
  return useQuery<CollaborationThread[]>({
    queryKey: ["collaboration-threads", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("agent_collaboration_threads")
        .select("*, agent_collaboration_messages(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((t: any) => ({ ...t, messages: t.agent_collaboration_messages ?? [] }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCollaborationThread() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; initial_agent: string; message: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: thread, error } = await q("agent_collaboration_threads")
        .insert({ workspace_id: workspaceId, title: data.title })
        .select("id")
        .single();
      if (error) throw error;
      await q("agent_collaboration_messages").insert({
        thread_id: thread.id,
        agent_slug: data.initial_agent,
        content: data.message,
      });
      return thread;
    },
    onSuccess: () => { toast.success("Collaboration thread created"); qc.invalidateQueries({ queryKey: ["collaboration-threads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
