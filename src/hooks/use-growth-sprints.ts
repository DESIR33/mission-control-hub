import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { startOfWeek, endOfWeek, format, differenceInDays } from "date-fns";

export interface SprintTask {
  id: string;
  title: string;
  completed: boolean;
  category: "content" | "outreach" | "engagement" | "deals" | "other";
}

export interface GrowthSprint {
  id: string;
  workspace_id: string;
  week_start: string;
  week_end: string;
  sub_target: number;
  sub_count_start: number | null;
  sub_count_end: number | null;
  goals: string[];
  tasks: SprintTask[];
  status: "planning" | "active" | "completed" | "skipped";
  retrospective: string | null;
  created_at: string;
  updated_at: string;
}

export function useCurrentSprint() {
  const { workspaceId } = useWorkspace();
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["current-sprint", workspaceId, weekStart],
    queryFn: async (): Promise<GrowthSprint | null> => {
      const { data, error } = await supabase
        .from("growth_sprints" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        goals: Array.isArray(data.goals) ? data.goals : [],
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
      } as unknown as GrowthSprint;
    },
    enabled: !!workspaceId,
  });
}

export function useSprintHistory() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["sprint-history", workspaceId],
    queryFn: async (): Promise<GrowthSprint[]> => {
      const { data, error } = await supabase
        .from("growth_sprints" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("week_start", { ascending: false })
        .limit(12);
      if (error) throw error;
      return ((data ?? []) as any[]).map((d) => ({
        ...d,
        goals: Array.isArray(d.goals) ? d.goals : [],
        tasks: Array.isArray(d.tasks) ? d.tasks : [],
      })) as unknown as GrowthSprint[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSprint() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      subTarget: number;
      subCountStart?: number;
      goals?: string[];
      tasks?: SprintTask[];
    }) => {
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("growth_sprints" as any)
        .insert({
          workspace_id: workspaceId,
          week_start: weekStart,
          week_end: weekEnd,
          sub_target: input.subTarget,
          sub_count_start: input.subCountStart ?? null,
          goals: input.goals ?? [],
          tasks: input.tasks ?? [],
          status: "active",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-sprint"] });
      qc.invalidateQueries({ queryKey: ["sprint-history"] });
    },
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GrowthSprint> & { id: string }) => {
      const { error } = await supabase
        .from("growth_sprints" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-sprint"] });
      qc.invalidateQueries({ queryKey: ["sprint-history"] });
    },
  });
}
