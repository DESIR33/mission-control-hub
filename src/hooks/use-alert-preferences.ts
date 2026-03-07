import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AlertPreferences {
  id: string;
  workspace_id: string;
  push_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  viral_video_threshold: number; // multiplier, e.g., 5 means 5x average views
  sub_milestones: number[]; // e.g., [25000, 30000, 40000, 50000]
  ctr_drop_threshold: number; // percentage, e.g., 20
  deal_stage_alerts: boolean;
  weekly_digest: boolean;
}

export interface AlertHistoryEntry {
  id: string;
  workspace_id: string;
  alert_type: string;
  message: string;
  severity: "celebration" | "warning" | "info";
  created_at: string;
}

const DEFAULT_PREFERENCES: Omit<AlertPreferences, "id" | "workspace_id"> = {
  push_enabled: false,
  telegram_enabled: false,
  telegram_chat_id: null,
  viral_video_threshold: 5,
  sub_milestones: [25000, 30000, 40000, 50000],
  ctr_drop_threshold: 20,
  deal_stage_alerts: true,
  weekly_digest: true,
};

export function useAlertPreferences() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["alert-preferences", workspaceId],
    queryFn: async (): Promise<AlertPreferences> => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("alert_preferences" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          id: "",
          workspace_id: workspaceId,
          ...DEFAULT_PREFERENCES,
        };
      }

      const row = data as any;
      return {
        id: row.id as string,
        workspace_id: row.workspace_id as string,
        push_enabled: (row.push_enabled as boolean) ?? false,
        telegram_enabled: (row.telegram_enabled as boolean) ?? false,
        telegram_chat_id: (row.telegram_chat_id as string) ?? null,
        viral_video_threshold: (row.viral_video_threshold as number) ?? 5,
        sub_milestones: (row.sub_milestones as number[]) ?? [25000, 30000, 40000, 50000],
        ctr_drop_threshold: (row.ctr_drop_threshold as number) ?? 20,
        deal_stage_alerts: (row.deal_stage_alerts as boolean) ?? true,
        weekly_digest: (row.weekly_digest as boolean) ?? true,
      };
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateAlertPreferences() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      prefs: Partial<Omit<AlertPreferences, "id" | "workspace_id">>
    ) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("alert_preferences" as any)
        .upsert(
          {
            workspace_id: workspaceId,
            ...prefs,
          },
          { onConflict: "workspace_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["alert-preferences", workspaceId],
      });
    },
  });
}

export function useAlertHistory() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["alert-history", workspaceId],
    queryFn: async (): Promise<AlertHistoryEntry[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("alert_history" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return ((data as any[]) ?? []).map((row) => ({
        id: row.id as string,
        workspace_id: row.workspace_id as string,
        alert_type: (row.alert_type as string) ?? "",
        message: (row.message as string) ?? "",
        severity: (row.severity as AlertHistoryEntry["severity"]) ?? "info",
        created_at: (row.created_at as string) ?? "",
      }));
    },
    enabled: !!workspaceId,
  });
}
