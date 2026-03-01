import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface Collaboration {
  id: string;
  workspace_id: string;
  creator_name: string;
  channel_url: string | null;
  subscriber_count: number | null;
  niche: string | null;
  contact_id: string | null;
  status: "prospect" | "contacted" | "negotiating" | "confirmed" | "published" | "declined";
  collab_type: "guest" | "interview" | "collab_video" | "shoutout" | "cross_promo" | "other" | null;
  expected_sub_gain: number | null;
  actual_sub_gain: number | null;
  video_queue_id: number | null;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCollaborations() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["collaborations", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborations" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Collaboration[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCollaboration() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (collab: Partial<Collaboration>) => {
      const { data, error } = await supabase
        .from("collaborations" as any)
        .insert({ ...collab, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborations"] }),
  });
}

export function useUpdateCollaboration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Collaboration> & { id: string }) => {
      const { data, error } = await supabase
        .from("collaborations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborations"] }),
  });
}

export function useDeleteCollaboration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaborations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborations"] }),
  });
}
