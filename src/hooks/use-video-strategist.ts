import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import type {
  VideoOptimizationExperiment,
  StrategistDailyRun,
  StrategistNotification,
  VideoOptimizationProposal,
} from "@/types/strategist";

const query = (table: string) => (supabase as any).from(table);

// ── Optimization Proposals ──────────────────────────────────

export function useOptimizationProposals() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationProposal[]>({
    queryKey: ["optimization-proposals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("ai_proposals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("proposal_type", [
          "video_title_optimization",
          "video_description_optimization",
          "video_tags_optimization",
          "video_thumbnail_optimization",
        ])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationProposal[];
    },
    enabled: !!workspaceId,
  });
}

export function usePendingOptimizations() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationProposal[]>({
    queryKey: ["pending-optimizations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("ai_proposals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .in("proposal_type", [
          "video_title_optimization",
          "video_description_optimization",
          "video_tags_optimization",
          "video_thumbnail_optimization",
        ])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationProposal[];
    },
    enabled: !!workspaceId,
  });
}

// ── Approve / Dismiss ───────────────────────────────────────

export function useApproveOptimization() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, selectedOption }: { proposalId: string; selectedOption?: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      // If a specific option was selected (e.g., one of 3 title options), update proposed_changes
      if (selectedOption) {
        const { data: proposal } = await query("ai_proposals")
          .select("proposed_changes")
          .eq("id", proposalId)
          .single();

        if (proposal) {
          const changes = proposal.proposed_changes || {};
          changes.selected_option = selectedOption;
          if (changes.titles) {
            changes.title = selectedOption;
          }
          await query("ai_proposals")
            .update({ proposed_changes: changes })
            .eq("id", proposalId);
        }
      }

      // Approve the proposal
      await query("ai_proposals")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", proposalId);

      // Execute the proposal
      const { data, error } = await supabase.functions.invoke("execute-proposal", {
        body: { proposal_id: proposalId, workspace_id: workspaceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Optimization approved and applied!");
      queryClient.invalidateQueries({ queryKey: ["optimization-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-optimizations"] });
      queryClient.invalidateQueries({ queryKey: ["active-experiments"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to apply optimization: ${err.message}`);
    },
  });
}

export function useDismissOptimization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await query("ai_proposals")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recommendation dismissed");
      queryClient.invalidateQueries({ queryKey: ["optimization-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-optimizations"] });
    },
  });
}

// ── Thumbnail Generation ────────────────────────────────────

export function useGenerateThumbnail() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, prompt }: { proposalId: string; prompt: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("thumbnail-generate", {
        body: {
          action: "generate",
          prompt,
          model: "nano-banana-2",
          proposal_id: proposalId,
          workspace_id: workspaceId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Thumbnail generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["optimization-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-optimizations"] });
    },
    onError: (err: any) => {
      toast.error(`Thumbnail generation failed: ${err.message}`);
    },
  });
}

// ── Experiments ─────────────────────────────────────────────

export function useActiveExperiments() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationExperiment[]>({
    queryKey: ["active-experiments", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("video_optimization_experiments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationExperiment[];
    },
    enabled: !!workspaceId,
    refetchInterval: 60000,
  });
}

export function useExperimentHistory() {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationExperiment[]>({
    queryKey: ["experiment-history", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("video_optimization_experiments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["completed", "rolled_back"])
        .order("completed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationExperiment[];
    },
    enabled: !!workspaceId,
  });
}

export function useRollbackExperiment() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (experimentId: string) => {
      if (!workspaceId) throw new Error("No workspace");
      // Manual rollback: update experiment status, then call YouTube API to revert
      const { data: experiment, error: fetchError } = await query("video_optimization_experiments")
        .select("*")
        .eq("id", experimentId)
        .eq("workspace_id", workspaceId)
        .single();

      if (fetchError || !experiment) throw new Error("Experiment not found");

      // Call YouTube API to revert
      const { error: revertError } = await supabase.functions.invoke("youtube-video-update", {
        body: {
          action: "update_metadata",
          workspace_id: workspaceId,
          video_id: experiment.video_id,
          title: experiment.original_title,
          description: experiment.original_description,
          tags: experiment.original_tags,
        },
      });

      if (revertError) throw revertError;

      // Update experiment status
      await query("video_optimization_experiments")
        .update({
          status: "rolled_back",
          rolled_back_at: new Date().toISOString(),
          rollback_reason: "Manual rollback by user",
        })
        .eq("id", experimentId);
    },
    onSuccess: () => {
      toast.success("Experiment rolled back. Original values restored.");
      queryClient.invalidateQueries({ queryKey: ["active-experiments"] });
      queryClient.invalidateQueries({ queryKey: ["experiment-history"] });
    },
    onError: (err: any) => {
      toast.error(`Rollback failed: ${err.message}`);
    },
  });
}

// ── Daily Runs ──────────────────────────────────────────────

export function useStrategistRuns() {
  const { workspaceId } = useWorkspace();
  return useQuery<StrategistDailyRun[]>({
    queryKey: ["strategist-runs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("strategist_daily_runs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("run_date", { ascending: false })
        .limit(14);
      if (error) throw error;
      return (data ?? []) as unknown as StrategistDailyRun[];
    },
    enabled: !!workspaceId,
  });
}

// ── Notifications ───────────────────────────────────────────

export function useStrategistNotifications() {
  const { workspaceId } = useWorkspace();
  return useQuery<StrategistNotification[]>({
    queryKey: ["strategist-notifications", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("strategist_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as StrategistNotification[];
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await query("strategist_notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategist-notifications"] });
    },
  });
}

// ── Manual Trigger ──────────────────────────────────────────

export function useTriggerStrategistRun() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("strategist-daily-run", {
        body: { source: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Strategist run complete! ${data.total_proposals_created || 0} recommendations generated.`);
      queryClient.invalidateQueries({ queryKey: ["strategist-runs"] });
      queryClient.invalidateQueries({ queryKey: ["pending-optimizations"] });
      queryClient.invalidateQueries({ queryKey: ["optimization-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["strategist-notifications"] });
    },
    onError: (err: any) => {
      toast.error(`Strategist run failed: ${err.message}`);
    },
  });
}
