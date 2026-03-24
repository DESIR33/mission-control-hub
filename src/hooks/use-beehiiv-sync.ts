import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function useBeehiivSync() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("beehiiv-sync", {
        body: { workspace_id: workspaceId },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.errors?.[0] ?? "Sync failed");
      return data as {
        ok: boolean;
        subscribers_synced: number;
        posts_synced: number;
        errors: string[];
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
      qc.invalidateQueries({ queryKey: ["subscriber-analytics", workspaceId] });
      qc.invalidateQueries({ queryKey: ["newsletter-issues", workspaceId] });
    },
  });
}
