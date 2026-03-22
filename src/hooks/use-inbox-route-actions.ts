import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const q = (table: string) => (supabase as any).from(table);

export interface InboxRouteAction {
  id: string;
  workspace_id: string;
  email_id: string;
  action_type: string;
  confidence: number;
  status: string;
  payload: Record<string, any>;
  rationale: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  result_entity_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  email?: { subject: string; from_name: string; from_email: string } | null;
}

export function useInboxRouteActions(statusFilter?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["inbox-route-actions", workspaceId, statusFilter],
    queryFn: async (): Promise<InboxRouteAction[]> => {
      if (!workspaceId) return [];
      let query = q("inbox_route_actions")
        .select("*, inbox_emails(subject, from_name, from_email)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as any[]).map((r: any) => ({
        ...r,
        email: r.inbox_emails ?? null,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function usePendingRouteActionCount() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["inbox-route-actions-count", workspaceId],
    queryFn: async (): Promise<number> => {
      if (!workspaceId) return 0;
      const { count, error } = await q("inbox_route_actions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!workspaceId,
  });
}

export function useApproveRouteAction() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      // Get the action details
      const { data: action, error: fetchErr } = await q("inbox_route_actions")
        .select("*")
        .eq("id", actionId)
        .single();
      if (fetchErr) throw fetchErr;

      // Execute the action via edge function
      const { data, error } = await supabase.functions.invoke("execute-route-action", {
        body: { action_id: actionId, workspace_id: action.workspace_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-route-actions"] });
      qc.invalidateQueries({ queryKey: ["inbox-route-actions-count"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useRejectRouteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await q("inbox_route_actions")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-route-actions"] });
      qc.invalidateQueries({ queryKey: ["inbox-route-actions-count"] });
    },
  });
}

export function useBulkApproveRouteActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actionIds: string[]) => {
      for (const id of actionIds) {
        const { data: action } = await q("inbox_route_actions")
          .select("*")
          .eq("id", id)
          .single();
        if (!action) continue;

        await supabase.functions.invoke("execute-route-action", {
          body: { action_id: id, workspace_id: action.workspace_id },
        });
      }
      return { executed: actionIds.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-route-actions"] });
      qc.invalidateQueries({ queryKey: ["inbox-route-actions-count"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
