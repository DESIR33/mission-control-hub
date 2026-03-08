import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import type { VideoOptimizationExperiment } from "@/types/strategist";

const query = (table: string) => (supabase as any).from(table);

/** Fetch experiments for a specific video */
export function useVideoOptimizationExperiments(videoId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationExperiment[]>({
    queryKey: ["video-optimization-experiments", workspaceId, videoId],
    queryFn: async () => {
      if (!workspaceId || !videoId) return [];
      const { data, error } = await query("video_optimization_experiments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("video_id", videoId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationExperiment[];
    },
    enabled: !!workspaceId && !!videoId,
  });
}

/** Fetch ALL experiments across videos for comparison */
export function useAllOptimizationExperiments(statusFilter?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoOptimizationExperiment[]>({
    queryKey: ["all-optimization-experiments", workspaceId, statusFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("video_optimization_experiments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (statusFilter && statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VideoOptimizationExperiment[];
    },
    enabled: !!workspaceId,
  });
}

/** Save a lesson learned on an experiment (feeds back to agents) */
export function useSaveExperimentLesson() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ experimentId, lesson }: { experimentId: string; lesson: string }) => {
      const { error } = await query("video_optimization_experiments")
        .update({ lesson_learned: lesson, updated_at: new Date().toISOString() })
        .eq("id", experimentId);
      if (error) throw error;

      // Also save as agent memory for future optimization context
      if (workspaceId) {
        await query("assistant_memory").insert({
          workspace_id: workspaceId,
          content: `Optimization experiment lesson: ${lesson}`,
          origin: "experiment_feedback",
          tags: ["optimization", "experiment", "feedback"],
        });
      }
    },
    onSuccess: () => {
      toast.success("Lesson saved and added to agent memory");
      queryClient.invalidateQueries({ queryKey: ["video-optimization-experiments"] });
      queryClient.invalidateQueries({ queryKey: ["all-optimization-experiments"] });
      queryClient.invalidateQueries({ queryKey: ["active-experiments"] });
      queryClient.invalidateQueries({ queryKey: ["experiment-history"] });
    },
  });
}

/** Compute delta percentages */
export function computeDelta(baseline: number, result: number | null): { value: number; percent: number; positive: boolean } | null {
  if (result == null || baseline === 0) return null;
  const diff = result - baseline;
  const percent = (diff / baseline) * 100;
  return { value: diff, percent, positive: diff > 0 };
}
