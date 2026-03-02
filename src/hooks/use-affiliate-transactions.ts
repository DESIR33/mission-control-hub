import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AffiliateTransaction {
  id: string;
  workspace_id: string;
  affiliate_program_id: string | null;
  video_queue_id: string | null;
  amount: number;
  currency: string;
  status: string;
  transaction_date: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useAffiliateTransactions() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["affiliate-transactions", workspaceId],
    queryFn: async (): Promise<AffiliateTransaction[]> => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });
}

export function useAffiliateTransactionsByVideo(videoQueueId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["affiliate-transactions-video", workspaceId, videoQueueId],
    queryFn: async (): Promise<AffiliateTransaction[]> => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("video_queue_id", videoQueueId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId && !!videoQueueId,
  });
}

export function useCreateAffiliateTransaction() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AffiliateTransaction>) => {
      const { error } = await supabase
        .from("affiliate_transactions" as any)
        .insert({ ...input, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-transactions"] }),
  });
}

export function useUpdateAffiliateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<AffiliateTransaction>) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("affiliate_transactions" as any)
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-transactions"] }),
  });
}
