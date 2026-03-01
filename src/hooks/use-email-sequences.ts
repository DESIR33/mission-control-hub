import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface SequenceStep {
  step_number: number;
  delay_days: number;
  subject_template: string;
  body_template: string;
}

export interface EmailSequence {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  steps: SequenceStep[];
  status: "active" | "paused" | "archived";
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollment {
  id: string;
  workspace_id: string;
  sequence_id: string;
  contact_id: string;
  deal_id: string | null;
  current_step: number;
  status: "active" | "paused" | "completed" | "replied";
  enrolled_at: string;
  next_send_at: string | null;
  completed_at: string | null;
}

export function useEmailSequences() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["email-sequences", workspaceId],
    queryFn: async (): Promise<EmailSequence[]> => {
      const { data, error } = await supabase
        .from("email_sequences" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmailSequence[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateEmailSequence() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; steps: SequenceStep[] }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("email_sequences" as any).insert({
        workspace_id: workspaceId,
        name: input.name,
        description: input.description ?? null,
        steps: input.steps,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-sequences", workspaceId] }),
  });
}

export function useUpdateEmailSequence() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string; steps?: SequenceStep[]; status?: string }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.steps !== undefined) updates.steps = input.steps;
      if (input.status !== undefined) updates.status = input.status;
      const { error } = await supabase.from("email_sequences" as any).update(updates as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-sequences", workspaceId] }),
  });
}

export function useDeleteEmailSequence() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_sequences" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-sequences", workspaceId] }),
  });
}

export function useSequenceEnrollments(sequenceId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["sequence-enrollments", workspaceId, sequenceId],
    queryFn: async (): Promise<SequenceEnrollment[]> => {
      let query = supabase
        .from("email_sequence_enrollments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("enrolled_at", { ascending: false });
      if (sequenceId) query = query.eq("sequence_id", sequenceId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SequenceEnrollment[];
    },
    enabled: !!workspaceId,
  });
}

export function useEnrollContact() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sequenceId: string; contactId: string; dealId?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const firstStepDelay = 0;
      const nextSend = new Date(Date.now() + firstStepDelay * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("email_sequence_enrollments" as any).insert({
        workspace_id: workspaceId,
        sequence_id: input.sequenceId,
        contact_id: input.contactId,
        deal_id: input.dealId ?? null,
        current_step: 0,
        status: "active",
        next_send_at: nextSend,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence-enrollments", workspaceId] }),
  });
}

export function useUpdateEnrollment() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; current_step?: number; next_send_at?: string | null }) => {
      const updates: Record<string, unknown> = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.current_step !== undefined) updates.current_step = input.current_step;
      if (input.next_send_at !== undefined) updates.next_send_at = input.next_send_at;
      if (input.status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("email_sequence_enrollments" as any).update(updates as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence-enrollments", workspaceId] }),
  });
}
