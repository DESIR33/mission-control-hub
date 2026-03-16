import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Returns a singleton Supabase admin client using the service role key.
 * Reuses the same client instance across invocations within the same
 * function lifecycle, avoiding repeated client creation overhead.
 */
export function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _adminClient;
}

/**
 * Fetches an integration config for a workspace.
 * Centralizes the repeated pattern of querying workspace_integrations.
 */
export async function getIntegrationConfig(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  integrationKey: string
): Promise<Record<string, any> | null> {
  const { data } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("integration_key", integrationKey)
    .eq("enabled", true)
    .single();

  return data?.config ?? null;
}
