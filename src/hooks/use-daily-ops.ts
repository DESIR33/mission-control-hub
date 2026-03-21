import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";

export interface OpsItem {
  id: string;
  workspace_id: string;
  source_type: "task" | "proposal" | "deal" | "inbox" | "content";
  source_id: string;
  title: string;
  subtitle: string | null;
  urgency_score: number;
  urgency_factors: Record<string, number>;
  time_block: "morning" | "afternoon" | "evening";
  status: "pending" | "snoozed" | "done" | "dismissed";
  snoozed_until: string | null;
  due_at: string | null;
  metadata: Record<string, unknown>;
  scored_at: string;
  created_at: string;
}

const SOURCE_ICONS: Record<string, string> = {
  task: "✅",
  proposal: "🤖",
  deal: "💰",
  inbox: "📧",
  content: "🎬",
};

export function useRefreshOpsScoring() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("score-daily-ops", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-ops-items"] });
    },
    onError: (err) => {
      toast({ title: "Scoring failed", description: String(err), variant: "destructive" });
    },
  });
}

export function useDailyOpsItems() {
  const { workspaceId } = useWorkspace();

  return useQuery<OpsItem[]>({
    queryKey: ["daily-ops-items", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("ops_daily_items" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "snoozed"])
        .order("urgency_score", { ascending: false });
      if (error) throw error;
      return (data as unknown as OpsItem[]) ?? [];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useOpsAction() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      item,
      action,
      snoozedUntil,
    }: {
      item: OpsItem;
      action: "done" | "dismissed" | "snoozed" | "approved" | "rejected" | "followed_up";
      snoozedUntil?: string;
    }) => {
      const newStatus = action === "snoozed" ? "snoozed" : action === "dismissed" ? "dismissed" : "done";

      // Update ops item
      const { error: updateErr } = await supabase
        .from("ops_daily_items" as any)
        .update({
          status: newStatus,
          ...(snoozedUntil ? { snoozed_until: snoozedUntil } : {}),
        } as any)
        .eq("id", item.id);
      if (updateErr) throw updateErr;

      // Log outcome for learning
      const timeToAction = Math.round(
        (Date.now() - new Date(item.scored_at).getTime()) / 60000
      );
      const { error: logErr } = await supabase
        .from("ops_completion_outcomes" as any)
        .insert({
          workspace_id: workspaceId,
          ops_item_id: item.id,
          source_type: item.source_type,
          source_id: item.source_id,
          action_taken: action,
          urgency_score_at_action: item.urgency_score,
          time_to_action_minutes: timeToAction,
          metadata: item.metadata,
        } as any);
      if (logErr) console.warn("Failed to log outcome:", logErr);

      return { action, item };
    },
    onSuccess: ({ action }) => {
      queryClient.invalidateQueries({ queryKey: ["daily-ops-items"] });
      const labels: Record<string, string> = {
        done: "Marked complete",
        dismissed: "Dismissed",
        snoozed: "Snoozed",
        approved: "Proposal approved",
        rejected: "Proposal rejected",
        followed_up: "Follow-up sent",
      };
      toast({ title: labels[action] ?? "Action completed" });
    },
    onError: (err) => {
      toast({ title: "Action failed", description: String(err), variant: "destructive" });
    },
  });
}

export { SOURCE_ICONS };
