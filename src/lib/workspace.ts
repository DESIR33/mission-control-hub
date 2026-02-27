import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current user has a workspace. Creates one if not.
 * Returns the workspace_id.
 */
export async function ensureWorkspace(userId: string, email: string): Promise<string> {
  // Check existing membership first (fast path)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership) return membership.workspace_id;

  // Use security-definer RPC to atomically create workspace + member
  const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-" + Date.now().toString(36);

  const { data, error } = await supabase.rpc("bootstrap_workspace", {
    ws_name: "My Workspace",
    ws_slug: slug,
  });

  if (error || !data) throw new Error("Failed to bootstrap workspace: " + error?.message);

  return data as string;
}
