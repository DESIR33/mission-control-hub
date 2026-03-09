import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface CompanyIntel {
  id: string;
  workspace_id: string;
  company_id: string;
  intel_type: "social_post" | "product_launch" | "content" | "news";
  source: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  relevance_score: number;
  metadata: Record<string, unknown>;
  detected_at: string;
  is_read: boolean;
  created_at: string;
}

export function useCompanyIntel(companyId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<CompanyIntel[]>({
    queryKey: ["company-intel", workspaceId, companyId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("company_intel")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("detected_at", { ascending: false })
        .limit(50);
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CompanyIntel[];
    },
    enabled: !!workspaceId,
  });
}

export function useMarkIntelRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("company_intel").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-intel"] }),
  });
}
