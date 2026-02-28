import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Deal, DealStage } from "@/types/crm";

export function useDeals() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["deals", workspaceId],
    queryFn: async (): Promise<Deal[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("deals")
        .select("*, contacts(id, first_name, last_name, email, role, status), companies(id, name, logo_url, industry)")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        stage: row.stage as DealStage,
        contact: row.contacts as Deal["contact"] ?? null,
        company: row.companies as Deal["company"] ?? null,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateDeal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: {
      title: string;
      value?: number;
      currency?: string;
      stage?: string;
      forecast_category?: string;
      contact_id?: string;
      company_id?: string;
      expected_close_date?: string;
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...deal,
          workspace_id: workspaceId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}

export function useUpdateDeal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      value?: number | null;
      currency?: string;
      stage?: string;
      forecast_category?: string | null;
      contact_id?: string | null;
      company_id?: string | null;
      expected_close_date?: string | null;
      closed_at?: string | null;
      notes?: string | null;
    }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}

export function useDeleteDeal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("deals")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}
