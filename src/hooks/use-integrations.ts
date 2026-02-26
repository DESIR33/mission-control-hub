import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// Stub — workspace_integrations table doesn't exist yet.
export function useIntegrations() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["workspace_integrations", workspaceId],
    queryFn: async (): Promise<WorkspaceIntegration[]> => [],
    enabled: !!workspaceId,
  });
}

export function useUpsertIntegration() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { integration_key: IntegrationKey; enabled: boolean; config?: Record<string, string> }) => null,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace_integrations", workspaceId] }),
  });
}

export function useDisconnectIntegration() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_key: IntegrationKey) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace_integrations", workspaceId] }),
  });
}
