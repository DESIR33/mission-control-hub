import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface ChurnRiskEntry {
  id: string;
  workspace_id: string;
  subscriber_id: string;
  risk_score: number;
  risk_level: string;
  declining_opens: boolean;
  declining_clicks: boolean;
  days_since_last_open: number | null;
  days_since_last_click: number | null;
  recent_open_rate: number;
  recent_click_rate: number;
  reengagement_sequence_id: string | null;
  reengagement_status: string;
  journey_tier: string;
  journey_started_at: string | null;
  journey_completed_at: string | null;
  saved: boolean;
  saved_at: string | null;
  pre_journey_open_rate: number;
  post_journey_open_rate: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
  // joined
  subscriber_email?: string;
  subscriber_name?: string;
}

export interface ChurnRecoveryOutcome {
  id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  total_at_risk: number;
  low_risk_count: number;
  medium_risk_count: number;
  high_risk_count: number;
  critical_risk_count: number;
  journeys_triggered: number;
  journeys_completed: number;
  subscribers_saved: number;
  subscribers_lost: number;
  saved_rate: number;
  incremental_retained: number;
  created_at: string;
}

export interface UnsubscribeReason {
  id: string;
  workspace_id: string;
  subscriber_id: string;
  reason_category: string;
  reason_text: string | null;
  issue_id: string | null;
  created_at: string;
}

export interface ReengagementABTest {
  id: string;
  workspace_id: string;
  sequence_id: string | null;
  name: string;
  variant_a_subject: string;
  variant_b_subject: string;
  variant_a_sent: number;
  variant_a_opened: number;
  variant_b_sent: number;
  variant_b_opened: number;
  winner: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useChurnRiskSubscribers() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["churn-risk", workspaceId],
    queryFn: async (): Promise<ChurnRiskEntry[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("subscriber_churn_risk" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("risk_score", { ascending: false })
        .limit(100);
      if (error) throw error;

      const entries = (data ?? []) as unknown as ChurnRiskEntry[];

      const ids = entries.map((e) => e.subscriber_id);
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("subscribers" as any)
          .select("id, email, first_name, last_name")
          .in("id", ids);
        const subMap = new Map((subs as any[] ?? []).map((s: any) => [s.id, s]));
        for (const e of entries) {
          const s = subMap.get(e.subscriber_id);
          if (s) {
            e.subscriber_email = s.email;
            e.subscriber_name = [s.first_name, s.last_name].filter(Boolean).join(" ") || undefined;
          }
        }
      }

      return entries;
    },
    enabled: !!workspaceId,
  });
}

export function useChurnRecoveryOutcomes() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["churn-recovery-outcomes", workspaceId],
    queryFn: async (): Promise<ChurnRecoveryOutcome[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("churn_recovery_outcomes" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("period_start", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as ChurnRecoveryOutcome[];
    },
    enabled: !!workspaceId,
  });
}

export function useChurnTierSummary() {
  const { data: entries = [] } = useChurnRiskSubscribers();

  const tiers = { low: 0, medium: 0, high: 0, critical: 0 };
  let savedCount = 0;
  let journeysActive = 0;
  let totalAtRisk = entries.length;

  for (const e of entries) {
    if (e.risk_level in tiers) tiers[e.risk_level as keyof typeof tiers]++;
    if (e.saved) savedCount++;
    if (e.reengagement_status === "enrolled" || e.reengagement_status === "in_progress") journeysActive++;
  }

  const savedRate = totalAtRisk > 0 ? Math.round((savedCount / totalAtRisk) * 100) : 0;

  return { tiers, savedCount, journeysActive, totalAtRisk, savedRate };
}

export function useUnsubscribeReasons() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["unsubscribe-reasons", workspaceId],
    queryFn: async (): Promise<{ reasons: UnsubscribeReason[]; breakdown: Record<string, number> }> => {
      if (!workspaceId) return { reasons: [], breakdown: {} };
      const { data, error } = await supabase
        .from("subscriber_unsubscribe_reasons" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const reasons = (data ?? []) as unknown as UnsubscribeReason[];
      const breakdown: Record<string, number> = {};
      for (const r of reasons) {
        breakdown[r.reason_category] = (breakdown[r.reason_category] ?? 0) + 1;
      }
      return { reasons, breakdown };
    },
    enabled: !!workspaceId,
  });
}

export function useReengagementABTests() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["reengagement-ab-tests", workspaceId],
    queryFn: async (): Promise<ReengagementABTest[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("reengagement_ab_tests" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReengagementABTest[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateReengagementABTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; variant_a_subject: string; variant_b_subject: string; sequence_id?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("reengagement_ab_tests" as any)
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reengagement-ab-tests", workspaceId] });
    },
  });
}

export function useRunChurnDetection() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.functions.invoke("detect-churn-risk", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["churn-risk", workspaceId] });
      qc.invalidateQueries({ queryKey: ["churn-recovery-outcomes", workspaceId] });
    },
  });
}
