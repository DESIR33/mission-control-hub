import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";

export type NotificationType =
  | "overdue_task"
  | "deal_stage_change"
  | "new_contact"
  | "ai_proposal_ready";

export interface Notification {
  id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const queryKey = ["notifications", workspaceId];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, workspace_id, type, title, body, entity_type, entity_id, read_at, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!workspaceId,
    ...getFreshness("notifications"),
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("workspace_id", workspaceId!)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const { mutate: createNotification, isPending: isCreating } = useMutation({
    mutationFn: async (payload: {
      type: NotificationType;
      title: string;
      body?: string;
      entity_type?: string;
      entity_id?: string;
    }) => {
      const { error } = await supabase.from("notifications").insert({
        workspace_id: workspaceId!,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        entity_type: payload.entity_type ?? null,
        entity_id: payload.entity_id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    createNotification,
    isCreating,
  };
}
