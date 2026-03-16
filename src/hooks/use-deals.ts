import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export type DealStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: DealStage;
  forecast_category: string | null;
  contact_id: string | null;
  company_id: string | null;
  owner_id: string | null;
  expected_close_date: string | null;
  closed_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: { id: string; first_name: string; last_name: string | null; email: string | null } | null;
  company?: { id: string; name: string; logo_url: string | null } | null;
}

export function useDeals() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["deals", workspaceId],
    queryFn: async (): Promise<Deal[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("deals")
        .select("*, contacts(id, first_name, last_name, email), companies(id, name, logo_url)")
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
    staleTime: 120_000,
  });
}

export function useCreateDeal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: {
      title: string;
      value?: number | null;
      currency?: string;
      stage?: string;
      forecast_category?: string;
      contact_id?: string | null;
      company_id?: string | null;
      expected_close_date?: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-health"] });
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
      owner_id?: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-health"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
      queryClient.invalidateQueries({ queryKey: ["ai-briefing"] });
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-health"] });
    },
  });
}
