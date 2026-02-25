import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export type IntegrationKey = "ms_outlook" | "firecrawl" | "twitter";

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  integration_key: IntegrationKey;
  enabled: boolean;
  config: Record<string, string> | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useIntegrations() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["workspace_integrations", workspaceId],
    queryFn: async (): Promise<WorkspaceIntegration[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workspace_integrations")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        integration_key: row.integration_key as IntegrationKey,
        config: (row.config as Record<string, string>) ?? null,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertIntegration() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integration_key,
      enabled,
      config,
    }: {
      integration_key: IntegrationKey;
      enabled: boolean;
      config?: Record<string, string>;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const payload = {
        workspace_id: workspaceId,
        integration_key,
        enabled,
        config: config ?? {},
        connected_at: enabled ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("workspace_integrations")
        .upsert(payload, { onConflict: "workspace_id,integration_key" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace_integrations", workspaceId],
      });
    },
  });
}

export function useDisconnectIntegration() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration_key: IntegrationKey) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("workspace_integrations")
        .update({ enabled: false, config: {}, connected_at: null })
        .eq("workspace_id", workspaceId)
        .eq("integration_key", integration_key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace_integrations", workspaceId],
      });
    },
  });
}
