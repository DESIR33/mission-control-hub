import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface CompanyRevenueMap {
  [companyId: string]: {
    deals: number;
    affiliates: number;
    adRevenue: number;
    total: number;
  };
}

export function useCompanyRevenue() {
  const { workspaceId } = useWorkspace();

  // 1. Closed-won deals grouped by company
  const { data: deals = [] } = useQuery({
    queryKey: ["company-revenue-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("company_id, value")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "closed_won")
        .is("deleted_at", null)
        .not("company_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { company_id: string; value: number | null }[];
    },
    enabled: !!workspaceId,
  });

  // 2. Affiliate transactions via affiliate_programs → company_id
  const { data: affiliateData = [] } = useQuery({
    queryKey: ["company-revenue-affiliates", workspaceId],
    queryFn: async () => {
      const { data: programs, error: pErr } = await supabase
        .from("affiliate_programs")
        .select("id, company_id")
        .eq("workspace_id", workspaceId!)
        .not("company_id", "is", null);
      if (pErr) throw pErr;
      if (!programs?.length) return [];

      const { data: txns, error: tErr } = await supabase
        .from("affiliate_transactions" as any)
        .select("affiliate_program_id, amount")
        .eq("workspace_id", workspaceId!);
      if (tErr) throw tErr;

      const programCompany = new Map<string, string>();
      for (const p of programs) {
        if (p.company_id) programCompany.set(p.id, p.company_id);
      }

      return ((txns ?? []) as any[]).map((t) => ({
        company_id: programCompany.get(t.affiliate_program_id) ?? null,
        amount: Number(t.amount) || 0,
      })).filter((t) => t.company_id);
    },
    enabled: !!workspaceId,
  });

  // 3. Ad revenue from videos linked to companies via video_companies
  const { data: videoAdData = [] } = useQuery({
    queryKey: ["company-revenue-ads", workspaceId],
    queryFn: async () => {
      const { data: links, error: lErr } = await supabase
        .from("video_companies")
        .select("company_id, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (lErr) throw lErr;
      if (!links?.length) return [];

      const { data: analytics, error: aErr } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, estimated_revenue")
        .eq("workspace_id", workspaceId!);
      if (aErr) throw aErr;

      // Sum ad revenue per video
      const revenueByVideo = new Map<string, number>();
      for (const a of (analytics ?? []) as any[]) {
        const prev = revenueByVideo.get(a.youtube_video_id) ?? 0;
        revenueByVideo.set(a.youtube_video_id, prev + (Number(a.estimated_revenue) || 0));
      }

      // Deduplicate video-company pairs to avoid counting revenue multiple times
      const seen = new Set<string>();
      const result: { company_id: string; adRevenue: number }[] = [];
      for (const l of links) {
        const key = `${l.company_id}::${l.youtube_video_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          company_id: l.company_id,
          adRevenue: revenueByVideo.get(l.youtube_video_id) ?? 0,
        });
      }
      return result;
    },
    enabled: !!workspaceId,
  });

  const revenueMap = useMemo((): CompanyRevenueMap => {
    const map: CompanyRevenueMap = {};

    const ensure = (id: string) => {
      if (!map[id]) map[id] = { deals: 0, affiliates: 0, adRevenue: 0, total: 0 };
      return map[id];
    };

    for (const d of deals) {
      if (d.company_id) {
        const entry = ensure(d.company_id);
        entry.deals += Number(d.value) || 0;
      }
    }

    for (const a of affiliateData) {
      if (a.company_id) {
        const entry = ensure(a.company_id);
        entry.affiliates += a.amount;
      }
    }

    for (const v of videoAdData) {
      const entry = ensure(v.company_id);
      entry.adRevenue += v.adRevenue;
    }

    // Compute totals
    for (const id of Object.keys(map)) {
      const e = map[id];
      e.total = e.deals + e.affiliates + e.adRevenue;
    }

    return map;
  }, [deals, affiliateData, videoAdData]);

  return revenueMap;
}
