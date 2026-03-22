import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";

const q = (table: string) => (supabase as any).from(table);

// ─── Types ────────────────────────────────────────

export interface AutomationOperation {
  id: string;
  workspace_id: string;
  agent_slug: string;
  domain: string;
  operation_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  risk_level: string;
  status: string;
  confidence: number;
  payload: Record<string, any>;
  rationale: string | null;
  result: Record<string, any> | null;
  rollback_payload: Record<string, any> | null;
  rolled_back_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  execution_error: string | null;
  source_proposal_id: string | null;
  created_at: string;
}

export interface ApprovalPolicy {
  id: string;
  workspace_id: string;
  agent_slug: string | null;
  domain: string | null;
  risk_level: string;
  auto_approve: boolean;
  confidence_threshold: number;
  require_human_review: boolean;
  max_auto_executions_per_day: number;
  enabled: boolean;
  created_at: string;
}

export interface AgentROISnapshot {
  id: string;
  workspace_id: string;
  agent_slug: string;
  period_start: string;
  period_end: string;
  operations_proposed: number;
  operations_executed: number;
  operations_rejected: number;
  operations_rolled_back: number;
  time_saved_minutes: number;
  revenue_influenced: number;
  errors_count: number;
  avg_confidence: number;
  acceptance_rate: number;
}

// ─── Operations Feed ──────────────────────────────

export function useOperationsFeed(filters?: { domain?: string; status?: string; risk_level?: string; agent_slug?: string }) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["operations-feed", workspaceId, filters],
    queryFn: async (): Promise<AutomationOperation[]> => {
      if (!workspaceId) return [];
      let query = q("automation_operations_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.domain) query = query.eq("domain", filters.domain);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.risk_level) query = query.eq("risk_level", filters.risk_level);
      if (filters?.agent_slug) query = query.eq("agent_slug", filters.agent_slug);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AutomationOperation[];
    },
    enabled: !!workspaceId,
  });
}

export function useOperationCounts() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["operations-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { proposed: 0, executing: 0, executed: 0, failed: 0, rolled_back: 0, rejected: 0 };
      const counts: Record<string, number> = {};
      for (const status of ["proposed", "executing", "executed", "failed", "rolled_back", "rejected"]) {
        const { count } = await q("automation_operations_log")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", status);
        counts[status] = count ?? 0;
      }
      return counts;
    },
    enabled: !!workspaceId,
  });
}

// ─── Operation Actions ────────────────────────────

export function useApproveOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await q("automation_operations_log").update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations-feed"] });
      qc.invalidateQueries({ queryKey: ["operations-counts"] });
    },
  });
}

export function useRejectOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await q("automation_operations_log").update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations-feed"] });
      qc.invalidateQueries({ queryKey: ["operations-counts"] });
    },
  });
}

export function useRollbackOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await q("automation_operations_log").update({
        status: "rolled_back",
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations-feed"] });
      qc.invalidateQueries({ queryKey: ["operations-counts"] });
    },
  });
}

// ─── Approval Policies ───────────────────────────

export function useApprovalPolicies() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["approval-policies", workspaceId],
    queryFn: async (): Promise<ApprovalPolicy[]> => {
      if (!workspaceId) return [];
      const { data, error } = await q("automation_approval_policies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("risk_level", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ApprovalPolicy[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertApprovalPolicy() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policy: Partial<ApprovalPolicy> & { risk_level: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const row = { workspace_id: workspaceId, ...policy };
      const { error } = await q("automation_approval_policies")
        .upsert(row, { onConflict: "workspace_id,agent_slug,domain,risk_level" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval-policies"] }),
  });
}

export function useDeleteApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await q("automation_approval_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval-policies"] }),
  });
}

// ─── Agent ROI ────────────────────────────────────

export function useAgentROI() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["agent-roi", workspaceId],
    queryFn: async (): Promise<AgentROISnapshot[]> => {
      if (!workspaceId) return [];
      const { data, error } = await q("agent_roi_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("period_start", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AgentROISnapshot[];
    },
    enabled: !!workspaceId,
  });
}

// Computed live ROI from operations log
export function useLiveAgentROI() {
  const { data: ops = [] } = useOperationsFeed();

  return useMemo(() => {
    const agentMap = new Map<string, {
      slug: string;
      proposed: number;
      executed: number;
      rejected: number;
      rolledBack: number;
      failed: number;
      avgConfidence: number;
      totalConfidence: number;
      domains: Set<string>;
    }>();

    for (const op of ops) {
      const entry = agentMap.get(op.agent_slug) ?? {
        slug: op.agent_slug,
        proposed: 0, executed: 0, rejected: 0, rolledBack: 0, failed: 0,
        avgConfidence: 0, totalConfidence: 0, domains: new Set<string>(),
      };
      entry.proposed++;
      entry.totalConfidence += op.confidence;
      entry.domains.add(op.domain);
      if (op.status === "executed") entry.executed++;
      else if (op.status === "rejected") entry.rejected++;
      else if (op.status === "rolled_back") entry.rolledBack++;
      else if (op.status === "failed") entry.failed++;
      agentMap.set(op.agent_slug, entry);
    }

    return Array.from(agentMap.values()).map(a => ({
      ...a,
      avgConfidence: a.proposed > 0 ? Math.round(a.totalConfidence / a.proposed) : 0,
      acceptanceRate: a.proposed > 0 ? Math.round(((a.executed) / a.proposed) * 100) : 0,
      domains: Array.from(a.domains),
      timeSavedMin: Math.round(a.executed * 3), // ~3 min saved per auto action
    }));
  }, [ops]);
}
