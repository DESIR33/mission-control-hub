import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberSequence, SubscriberSequenceStep, SubscriberSequenceTrigger, SubscriberSequenceEnrollment } from "@/types/subscriber";

export function useSubscriberSequences() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-sequences", workspaceId],
    queryFn: async (): Promise<SubscriberSequence[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscriber_sequences" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data as any[]) ?? []).map((row) => ({
        ...row,
        steps: (row.steps as SubscriberSequenceStep[]) ?? [],
        trigger_config: (row.trigger_config as Record<string, unknown>) ?? {},
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSubscriberSequence() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      trigger_type?: SubscriberSequenceTrigger;
      trigger_config?: Record<string, unknown>;
      steps: SubscriberSequenceStep[];
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_sequences" as any)
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-sequences", workspaceId] });
    },
  });
}

export function useUpdateSubscriberSequence() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      description?: string;
      trigger_type?: SubscriberSequenceTrigger;
      trigger_config?: Record<string, unknown>;
      steps?: SubscriberSequenceStep[];
      status?: 'active' | 'paused' | 'archived';
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("subscriber_sequences" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-sequences", workspaceId] });
    },
  });
}

export function useDeleteSubscriberSequence() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("subscriber_sequences" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-sequences", workspaceId] });
    },
  });
}

export function useSequenceEnrollments(sequenceId: string | null) {
  return useQuery({
    queryKey: ["subscriber-sequence-enrollments", sequenceId],
    queryFn: async (): Promise<SubscriberSequenceEnrollment[]> => {
      if (!sequenceId) return [];

      const { data, error } = await supabase
        .from("subscriber_sequence_enrollments" as any)
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SubscriberSequenceEnrollment[];
    },
    enabled: !!sequenceId,
  });
}

export function useEnrollSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sequenceId, subscriberId }: { sequenceId: string; subscriberId: string }) => {
      const { data, error } = await supabase
        .from("subscriber_sequence_enrollments" as any)
        .insert({
          sequence_id: sequenceId,
          subscriber_id: subscriberId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriber-sequence-enrollments", variables.sequenceId] });
    },
  });
}
