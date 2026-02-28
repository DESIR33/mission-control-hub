import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useWorkspaceMembers() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, profiles(full_name, avatar_url, email)")
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        full_name: row.profiles?.full_name ?? null,
        avatar_url: row.profiles?.avatar_url ?? null,
        email: row.profiles?.email ?? null,
      }));
    },
    enabled: !!workspaceId,
  });
}
