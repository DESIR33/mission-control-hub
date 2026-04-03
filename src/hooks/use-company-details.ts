import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { FundingRound, CompanyPerson, CompanyPricing, CompanyRelationship } from "@/types/crm";

// ── Funding Rounds ─────────────────────────────────────────────────────
export function useFundingRounds(companyId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["funding-rounds", workspaceId, companyId],
    queryFn: async (): Promise<FundingRound[]> => {
      if (!workspaceId || !companyId) return [];
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FundingRound[];
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useCreateFundingRound() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (round: Omit<FundingRound, "id" | "workspace_id" | "created_at" | "updated_at">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.from("funding_rounds").insert({ ...round, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["funding-rounds", workspaceId, vars.company_id] }); },
  });
}

export function useDeleteFundingRound() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase.from("funding_rounds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["funding-rounds", workspaceId, vars.companyId] }); },
  });
}

// ── Company People ──────────────────────────────────────────────────────
export function useCompanyPeople(companyId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["company-people", workspaceId, companyId],
    queryFn: async (): Promise<CompanyPerson[]> => {
      if (!workspaceId || !companyId) return [];
      const { data, error } = await supabase
        .from("company_people")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId)
        .order("is_founder", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyPerson[];
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useCreateCompanyPerson() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (person: Omit<CompanyPerson, "id" | "workspace_id" | "created_at" | "updated_at">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.from("company_people").insert({ ...person, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["company-people", workspaceId, vars.company_id] }); },
  });
}

export function useDeleteCompanyPerson() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase.from("company_people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["company-people", workspaceId, vars.companyId] }); },
  });
}

// ── Company Pricing ─────────────────────────────────────────────────────
export function useCompanyPricingTiers(companyId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["company-pricing", workspaceId, companyId],
    queryFn: async (): Promise<CompanyPricing[]> => {
      if (!workspaceId || !companyId) return [];
      const { data, error } = await supabase
        .from("company_pricing")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CompanyPricing[];
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useCreateCompanyPricing() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pricing: Omit<CompanyPricing, "id" | "workspace_id" | "created_at" | "updated_at">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.from("company_pricing").insert({ ...pricing, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["company-pricing", workspaceId, vars.company_id] }); },
  });
}

export function useDeleteCompanyPricing() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase.from("company_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["company-pricing", workspaceId, vars.companyId] }); },
  });
}

// ── Company Relationships ───────────────────────────────────────────────
export function useCompanyRelationships(companyId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["company-relationships", workspaceId, companyId],
    queryFn: async (): Promise<(CompanyRelationship & { related_company: { id: string; name: string; logo_url: string | null } })[]> => {
      if (!workspaceId || !companyId) return [];
      // Get relationships where company is either side
      const [{ data: asA, error: e1 }, { data: asB, error: e2 }] = await Promise.all([
        supabase
          .from("company_relationships")
          .select("*, company_b:companies!company_relationships_company_b_id_fkey(id, name, logo_url)")
          .eq("workspace_id", workspaceId)
          .eq("company_a_id", companyId),
        supabase
          .from("company_relationships")
          .select("*, company_a:companies!company_relationships_company_a_id_fkey(id, name, logo_url)")
          .eq("workspace_id", workspaceId)
          .eq("company_b_id", companyId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const results: any[] = [];
      for (const r of asA ?? []) {
        results.push({ ...r, related_company: r.company_b });
      }
      for (const r of asB ?? []) {
        results.push({ ...r, related_company: r.company_a });
      }
      return results;
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useCreateCompanyRelationship() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rel: { company_a_id: string; company_b_id: string; relationship_type: string; notes?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.from("company_relationships").insert({ ...rel, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-relationships", workspaceId] }); },
  });
}

export function useDeleteCompanyRelationship() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("company_relationships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-relationships", workspaceId] }); },
  });
}
