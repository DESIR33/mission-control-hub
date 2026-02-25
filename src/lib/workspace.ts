import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current user has a workspace. Creates one if not.
 * Returns the workspace_id.
 */
export async function ensureWorkspace(userId: string, email: string): Promise<string> {
  // Check existing membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership) return membership.workspace_id;

  // Create a new workspace for this user
  const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-" + Date.now().toString(36);
  
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: "My Workspace", slug })
    .select("id")
    .single();

  if (wsError || !workspace) throw new Error("Failed to create workspace: " + wsError?.message);

  // Add user as admin
  const { error: memError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "admin" });

  if (memError) throw new Error("Failed to add workspace member: " + memError.message);

  return workspace.id;
}
