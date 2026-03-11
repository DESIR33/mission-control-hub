import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => supabase.from(table as any);

export interface FluxTrainingSession {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  trigger_word: string;
  replicate_training_id: string | null;
  replicate_model_name: string | null;
  replicate_model_version: string | null;
  training_started_at: string | null;
  training_completed_at: string | null;
  error_message: string | null;
  image_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FluxTrainingImage {
  id: string;
  session_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  caption: string | null;
  created_at: string;
}

export interface FluxGenerationFeedback {
  id: string;
  image_url: string;
  prompt: string | null;
  is_positive: boolean;
  created_at: string;
}

export function useFluxSessions() {
  const { workspaceId } = useWorkspace();
  return useQuery<FluxTrainingSession[]>({
    queryKey: ["flux-sessions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      // Fetching flux sessions for workspace
      const { data, error } = await query("flux_training_sessions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[flux-sessions] Error:", error);
        throw error;
      }
      // Sessions fetched successfully
      return (data ?? []) as unknown as FluxTrainingSession[];
    },
    enabled: !!workspaceId,
  });
}

export function useFluxImages(sessionId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<FluxTrainingImage[]>({
    queryKey: ["flux-images", workspaceId, sessionId],
    queryFn: async () => {
      if (!workspaceId || !sessionId) return [];
      const { data, error } = await query("flux_training_images")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FluxTrainingImage[];
    },
    enabled: !!workspaceId && !!sessionId,
  });
}

export function useCreateFluxSession() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; trigger_word?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await query("flux_training_sessions").insert({
        workspace_id: workspaceId,
        name: input.name,
        trigger_word: input.trigger_word || "MYFACE",
      }).select("id").single();
      if (error) throw error;
      return data as unknown as { id: string };
    },
    onSuccess: () => {
      toast.success("Training session created");
      qc.invalidateQueries({ queryKey: ["flux-sessions"] });
    },
  });
}

export function useUploadTrainingImage() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, file }: { sessionId: string; file: File }) => {
      if (!workspaceId) throw new Error("No workspace");
      const path = `${workspaceId}/${sessionId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("training-images")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { error } = await query("flux_training_images").insert({
        workspace_id: workspaceId,
        session_id: sessionId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flux-images"] });
    },
  });
}

export function useDeleteTrainingImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from("training-images").remove([storagePath]);
      const { error } = await query("flux_training_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Image removed");
      qc.invalidateQueries({ queryKey: ["flux-images"] });
    },
  });
}

export function useDeleteFluxSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Delete all images from storage first
      const { data: images } = await query("flux_training_images")
        .select("id, storage_path")
        .eq("session_id", sessionId);
      if (images && images.length > 0) {
        const paths = (images as any[]).map((i) => i.storage_path);
        await supabase.storage.from("training-images").remove(paths);
        await query("flux_training_images").delete().eq("session_id", sessionId);
      }
      const { error } = await query("flux_training_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session deleted");
      qc.invalidateQueries({ queryKey: ["flux-sessions"] });
    },
  });
}

export function useStartTraining() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("flux-trainer", {
        body: { action: "train", session_id: sessionId, workspace_id: workspaceId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Training failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Training started on Replicate!");
      qc.invalidateQueries({ queryKey: ["flux-sessions"] });
    },
  });
}

export function useCheckTrainingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("flux-trainer", {
        body: { action: "check_status", session_id: sessionId },
      });
      if (error) throw error;
      return data as {
        success: boolean;
        status: string;
        progress: number | null;
        current_step: number | null;
        total_steps: number | null;
        logs?: string;
      };
    },
    onSuccess: (data) => {
      if (data?.logs) {
        console.log('[flux-training] Logs:', data.logs);
      }
      qc.invalidateQueries({ queryKey: ["flux-sessions"] });
    },
  });
}

export function useFluxFeedback() {
  const { workspaceId } = useWorkspace();
  return useQuery<FluxGenerationFeedback[]>({
    queryKey: ["flux-feedback", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("flux_generation_feedback")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as FluxGenerationFeedback[];
    },
    enabled: !!workspaceId,
  });
}

export function useSubmitFeedback() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { imageUrl: string; prompt?: string; isPositive: boolean; sessionId?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await query("flux_generation_feedback").insert({
        workspace_id: workspaceId,
        session_id: input.sessionId || null,
        image_url: input.imageUrl,
        prompt: input.prompt || null,
        is_positive: input.isPositive,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isPositive ? "👍 Positive feedback saved" : "👎 Negative feedback saved");
      qc.invalidateQueries({ queryKey: ["flux-feedback"] });
    },
  });
}
