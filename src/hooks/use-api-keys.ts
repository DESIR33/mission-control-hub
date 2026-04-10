import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface ApiKey {
  id: string;
  workspace_id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  rate_limit_per_minute: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useApiKeys() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["api-keys", workspaceId],
    queryFn: async () => {
      const { data, error } = await query("api_keys")
        .select("id, workspace_id, key_prefix, name, permissions, rate_limit_per_minute, last_used_at, expires_at, is_active, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateApiKey() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, permissions }: { name: string; permissions?: string[] }) => {
      // Generate a random API key
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const rawKey = "mch_" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
      const prefix = rawKey.slice(0, 12) + "...";

      // Hash with SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { error } = await query("api_keys").insert({
        workspace_id: workspaceId,
        key_hash: keyHash,
        key_prefix: prefix,
        name,
        permissions: permissions || ["memory:write"],
      });

      if (error) throw error;
      return rawKey; // Return the raw key only once — user must copy it now
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => {
      toast.error("Failed to create API key: " + e.message);
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted");
    },
  });
}
