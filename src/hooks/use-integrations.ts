import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export type IntegrationKey = "ms_outlook" | "firecrawl" | "twitter" | "youtube" | "resend";

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_integrations")
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as WorkspaceIntegration[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertIntegration() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { integration_key: IntegrationKey; enabled: boolean; config?: Record<string, string> }) => {
      const { error } = await supabase.from("workspace_integrations").upsert(
        {
          workspace_id: workspaceId!,
          integration_key: args.integration_key,
          enabled: args.enabled,
          config: args.config ?? null,
          connected_at: args.enabled ? new Date().toISOString() : null,
        } as any,
        { onConflict: "workspace_id,integration_key" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace_integrations", workspaceId] }),
  });
}

export function useDisconnectIntegration() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: IntegrationKey) => {
      const { error } = await supabase
        .from("workspace_integrations")
        .delete()
        .eq("workspace_id", workspaceId!)
        .eq("integration_key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace_integrations", workspaceId] }),
  });
}
