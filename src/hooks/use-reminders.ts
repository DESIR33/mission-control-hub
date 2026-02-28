import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface Reminder {
  id: string;
  workspace_id: string;
  entity_id: string;
  entity_type: "contact" | "company";
  title: string;
  description: string | null;
  due_date: string;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
}

export function useReminders(entityId?: string, entityType?: string) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["reminders", workspaceId, entityId, entityType],
    queryFn: async (): Promise<Reminder[]> => {
      if (!workspaceId) return [];

      let query = supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("due_date", { ascending: true });

      if (entityId) {
        query = query.eq("entity_id", entityId);
      }
      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        entity_type: row.entity_type as Reminder["entity_type"],
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useUpcomingReminders() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["reminders-upcoming", workspaceId],
    queryFn: async (): Promise<Reminder[]> => {
      if (!workspaceId) return [];

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("completed_at", null)
        .lte("due_date", sevenDaysFromNow.toISOString())
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        entity_type: row.entity_type as Reminder["entity_type"],
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateReminder() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminder: {
      entity_id: string;
      entity_type: string;
      title: string;
      description?: string;
      due_date: string;
      assigned_to?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("follow_up_reminders")
        .insert({
          ...reminder,
          workspace_id: workspaceId,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["reminders-upcoming", workspaceId] });
    },
  });
}

export function useCompleteReminder() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("follow_up_reminders")
        .update({ completed_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["reminders-upcoming", workspaceId] });
    },
  });
}

export function useDeleteReminder() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["reminders-upcoming", workspaceId] });
    },
  });
}
