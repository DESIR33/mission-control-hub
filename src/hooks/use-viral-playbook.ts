import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface PlaybookRun {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string;
  viral_score: number;
  trigger_reason: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  views_at_trigger: number;
  views_current: number;
  subs_at_trigger: number;
  subs_gained: number;
  leads_generated: number;
  deals_generated: number;
  revenue_attributed: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  run_id: string;
  workspace_id: string;
  step_order: number;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  auto_generated: boolean;
  created_at: string;
}

export interface ConversionAsset {
  id: string;
  run_id: string;
  workspace_id: string;
  asset_type: string;
  title: string;
  content: string;
  status: string;
  published_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const q = (table: string) => (supabase as any).from(table);

export function usePlaybookRuns() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["viral-playbook-runs", workspaceId],
    queryFn: async (): Promise<PlaybookRun[]> => {
      if (!workspaceId) return [];
      const { data, error } = await q("viral_playbook_runs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PlaybookRun[];
    },
    enabled: !!workspaceId,
  });
}

export function usePlaybookChecklist(runId: string | null) {
  return useQuery({
    queryKey: ["viral-playbook-checklist", runId],
    queryFn: async (): Promise<ChecklistItem[]> => {
      if (!runId) return [];
      const { data, error } = await q("viral_playbook_checklist")
        .select("*")
        .eq("run_id", runId)
        .order("step_order");
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
    enabled: !!runId,
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await q("viral_playbook_checklist")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viral-playbook-checklist"] }),
  });
}

export function useConversionAssets(runId: string | null) {
  return useQuery({
    queryKey: ["viral-conversion-assets", runId],
    queryFn: async (): Promise<ConversionAsset[]> => {
      if (!runId) return [];
      const { data, error } = await q("viral_conversion_assets")
        .select("*")
        .eq("run_id", runId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ConversionAsset[];
    },
    enabled: !!runId,
  });
}

export function useUpdateAssetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (status === "published") update.published_at = new Date().toISOString();
      const { error } = await q("viral_conversion_assets").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viral-conversion-assets"] }),
  });
}

export function useTriggerViralPlaybook() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      video_id: string;
      video_title: string;
      viral_score: number;
      views: number;
      subs: number;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("viral-playbook", {
        body: { workspace_id: workspaceId, ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viral-playbook-runs", workspaceId] });
    },
  });
}

export function useCompletePlaybookRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await q("viral_playbook_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viral-playbook-runs"] }),
  });
}
