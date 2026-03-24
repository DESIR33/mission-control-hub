import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export type IntegrationKey = "ms_outlook" | "firecrawl" | "twitter" | "youtube" | "resend" | "beehiiv" | "slack" | "notion" | "perplexity" | "stripe" | "paypal" | "github" | "n8n";

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

/** Returns integration records WITHOUT config (secrets excluded from client) */
export function useIntegrations() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["workspace_integrations", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_integrations")
        .select("id, workspace_id, integration_key, enabled, connected_at, created_at, updated_at")
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
      const connectedAt = args.enabled ? new Date().toISOString() : null;
      const insertPayload = {
        workspace_id: workspaceId!,
        integration_key: args.integration_key,
        enabled: args.enabled,
        config: args.config ?? null,
        connected_at: connectedAt,
      } as const;

      const { error: insertError } = await supabase
        .from("workspace_integrations")
        .insert(insertPayload as any);

      if (!insertError) return;

      const isDuplicate =
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("duplicate key");

      if (!isDuplicate) {
        throw insertError;
      }

      const { error: updateError } = await supabase
        .from("workspace_integrations")
        .update(
          {
            enabled: args.enabled,
            config: args.config ?? null,
            connected_at: connectedAt,
          } as any
        )
        .eq("workspace_id", workspaceId!)
        .eq("integration_key", args.integration_key);

      if (updateError) throw updateError;
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

/** Fetch masked config for a specific integration (server-side masking) */
export function useMaskedConfig(integrationKey: IntegrationKey | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["integration_masked_config", workspaceId, integrationKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("integration-config-read", {
        body: { workspace_id: workspaceId, integration_key: integrationKey },
      });
      if (error) throw error;
      return data as { masked_config: Record<string, string>; raw_non_secret: Record<string, string> };
    },
    enabled: !!workspaceId && !!integrationKey,
  });
}

/** Test an integration's credentials */
export function useTestIntegration() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (integrationKey: IntegrationKey) => {
      const { data, error } = await supabase.functions.invoke("integration-test", {
        body: { workspace_id: workspaceId, integration_key: integrationKey },
      });
      if (error) throw error;
      return data as { valid: boolean; service: string; details?: Record<string, any>; errors?: string[] };
    },
  });
}
