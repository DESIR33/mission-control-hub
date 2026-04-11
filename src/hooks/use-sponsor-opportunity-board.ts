import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useDeals, type Deal } from "@/hooks/use-deals";
import { useCompanies } from "@/hooks/use-companies";
import { useSponsorMatchScore } from "@/hooks/use-sponsor-match-score";
import { startOfMonth, format, addMonths } from "date-fns";
import { safeGetTime } from "@/lib/date-utils";

const q = (table: string) => (supabase as any).from(table);

export interface SponsorOpportunity {
  id: string;
  workspace_id: string;
  month: string;
  company_id: string | null;
  company_name: string;
  sponsor_vertical: string;
  content_categories: string[];
  match_score: number;
  historical_win_rate: number;
  avg_deal_value: number;
  total_past_revenue: number;
  past_deal_count: number;
  suggested_outreach_week: number;
  suggested_package: string;
  package_rationale: string | null;
  outreach_status: string;
  notes: string | null;
  created_at: string;
}

export interface ContentTaxonomyMapping {
  id: string;
  workspace_id: string;
  content_category: string;
  sponsor_vertical: string;
  affinity_score: number;
  notes: string | null;
}

// Default taxonomy mapping
const DEFAULT_TAXONOMY: { content_category: string; sponsor_vertical: string; affinity_score: number }[] = [
  { content_category: "Tutorial", sponsor_vertical: "SaaS / Software", affinity_score: 85 },
  { content_category: "Tutorial", sponsor_vertical: "Developer Tools", affinity_score: 90 },
  { content_category: "Review", sponsor_vertical: "Consumer Tech", affinity_score: 80 },
  { content_category: "Review", sponsor_vertical: "SaaS / Software", affinity_score: 75 },
  { content_category: "Vlog", sponsor_vertical: "Lifestyle / DTC", affinity_score: 70 },
  { content_category: "Vlog", sponsor_vertical: "Consumer Tech", affinity_score: 60 },
  { content_category: "Interview", sponsor_vertical: "B2B Services", affinity_score: 75 },
  { content_category: "How-To", sponsor_vertical: "SaaS / Software", affinity_score: 85 },
  { content_category: "How-To", sponsor_vertical: "Education", affinity_score: 80 },
  { content_category: "News", sponsor_vertical: "Finance / Fintech", affinity_score: 65 },
  { content_category: "News", sponsor_vertical: "Consumer Tech", affinity_score: 70 },
  { content_category: "Challenge", sponsor_vertical: "Lifestyle / DTC", affinity_score: 80 },
  { content_category: "Shorts", sponsor_vertical: "Consumer Tech", affinity_score: 55 },
  { content_category: "Deep Dive", sponsor_vertical: "Developer Tools", affinity_score: 90 },
  { content_category: "Deep Dive", sponsor_vertical: "B2B Services", affinity_score: 80 },
];

// Package tiers based on deal history
function suggestPackage(avgDealValue: number, winRate: number, matchScore: number): { pkg: string; rationale: string } {
  const composite = matchScore * 0.4 + winRate * 30 + Math.min(avgDealValue / 100, 30);
  if (composite >= 70) return { pkg: "premium", rationale: "High match score, strong win history — pitch full integration bundle" };
  if (composite >= 45) return { pkg: "standard", rationale: "Good fit with solid track record — dedicated video + newsletter mention" };
  if (composite >= 25) return { pkg: "starter", rationale: "Emerging relationship — offer single mention or trial integration" };
  return { pkg: "explorer", rationale: "New prospect — propose lightweight trial placement to prove ROI" };
}

function suggestOutreachWeek(pastDeals: Deal[], monthStart: Date): number {
  // If past deals had specific close patterns, suggest outreach 4-6 weeks before
  const closedDeals = pastDeals.filter(d => d.stage === "closed_won" && d.closed_at);
  if (closedDeals.length === 0) return 1; // Default: reach out week 1 of the month

  // Average days from outreach to close
  const avgCycleDays = closedDeals.reduce((sum, d) => {
    const created = safeGetTime(d.created_at);
    const closed = safeGetTime(d.closed_at);
    return sum + (closed - created) / (1000 * 60 * 60 * 24);
  }, 0) / closedDeals.length;

  // If avg cycle < 14 days, outreach week 3; if < 30, week 2; else week 1
  if (avgCycleDays < 14) return 3;
  if (avgCycleDays < 30) return 2;
  return 1;
}

export function useTaxonomyMappings() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["content-sponsor-taxonomy", workspaceId],
    queryFn: async (): Promise<ContentTaxonomyMapping[]> => {
      if (!workspaceId) return [];
      const { data, error } = await q("content_sponsor_taxonomy")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("affinity_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentTaxonomyMapping[];
    },
    enabled: !!workspaceId,
  });
}

export function useSeedTaxonomy() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const rows = DEFAULT_TAXONOMY.map(t => ({ workspace_id: workspaceId, ...t }));
      const { error } = await q("content_sponsor_taxonomy").upsert(rows, { onConflict: "workspace_id,content_category,sponsor_vertical" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-sponsor-taxonomy"] }),
  });
}

export function useSponsorOpportunityBoard(targetMonth?: Date) {
  const { workspaceId } = useWorkspace();
  const month = startOfMonth(targetMonth ?? new Date());
  const monthStr = format(month, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["sponsor-opportunity-board", workspaceId, monthStr],
    queryFn: async (): Promise<SponsorOpportunity[]> => {
      if (!workspaceId) return [];
      const { data, error } = await q("sponsor_opportunity_board")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("month", monthStr)
        .order("match_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SponsorOpportunity[];
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateOpportunityBoard() {
  const { workspaceId } = useWorkspace();
  const { data: deals = [] } = useDeals();
  const { data: companies = [] } = useCompanies();
  const { data: matchScores = [] } = useSponsorMatchScore();
  const { data: taxonomy = [] } = useTaxonomyMappings();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetMonth: Date) => {
      if (!workspaceId) throw new Error("No workspace");
      const month = startOfMonth(targetMonth);
      const monthStr = format(month, "yyyy-MM-dd");

      // Build score map
      const scoreMap = new Map(matchScores.map(s => [s.companyId, s]));

      // Build deal history per company
      const dealsByCompany = new Map<string, Deal[]>();
      for (const deal of deals) {
        if (deal.company_id) {
          const arr = dealsByCompany.get(deal.company_id) ?? [];
          arr.push(deal);
          dealsByCompany.set(deal.company_id, arr);
        }
      }

      // Map industries to sponsor verticals
      const industryToVertical = (industry: string | null): string => {
        if (!industry) return "General";
        const lower = industry.toLowerCase();
        if (lower.includes("software") || lower.includes("saas") || lower.includes("tech")) return "SaaS / Software";
        if (lower.includes("developer") || lower.includes("devtools")) return "Developer Tools";
        if (lower.includes("finance") || lower.includes("fintech")) return "Finance / Fintech";
        if (lower.includes("education") || lower.includes("edtech")) return "Education";
        if (lower.includes("consumer") || lower.includes("ecommerce") || lower.includes("dtc")) return "Lifestyle / DTC";
        if (lower.includes("media") || lower.includes("entertainment")) return "Consumer Tech";
        return "B2B Services";
      };

      // Get content categories that map to each vertical from taxonomy
      const verticalToCategories = new Map<string, string[]>();
      for (const t of taxonomy) {
        const arr = verticalToCategories.get(t.sponsor_vertical) ?? [];
        if (!arr.includes(t.content_category)) arr.push(t.content_category);
        verticalToCategories.set(t.sponsor_vertical, arr);
      }

      const opportunities: any[] = [];

      for (const company of companies as any[]) {
        if (company.deleted_at) continue;

        const companyDeals = dealsByCompany.get(company.id) ?? [];
        const wonDeals = companyDeals.filter((d: Deal) => d.stage === "closed_won");
        const lostDeals = companyDeals.filter((d: Deal) => d.stage === "closed_lost");
        const totalClosed = wonDeals.length + lostDeals.length;
        const winRate = totalClosed > 0 ? wonDeals.length / totalClosed : 0;
        const totalRevenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
        const avgValue = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

        const scored = scoreMap.get(company.id);
        const matchScore = scored?.matchScore ?? 30;

        // Skip very low scoring companies
        if (matchScore < 20 && wonDeals.length === 0) continue;

        const vertical = industryToVertical(company.industry);
        const contentCategories = verticalToCategories.get(vertical) ?? ["General"];
        const { pkg, rationale } = suggestPackage(avgValue, winRate, matchScore);
        const outreachWeek = suggestOutreachWeek(companyDeals, month);

        opportunities.push({
          workspace_id: workspaceId,
          month: monthStr,
          company_id: company.id,
          company_name: company.name,
          sponsor_vertical: vertical,
          content_categories: contentCategories,
          match_score: matchScore,
          historical_win_rate: Math.round(winRate * 100),
          avg_deal_value: Math.round(avgValue),
          total_past_revenue: totalRevenue,
          past_deal_count: wonDeals.length,
          suggested_outreach_week: outreachWeek,
          suggested_package: pkg,
          package_rationale: rationale,
        });
      }

      // Sort by match score descending, take top 30
      opportunities.sort((a, b) => b.match_score - a.match_score);
      const top = opportunities.slice(0, 30);

      if (top.length > 0) {
        // Clear existing for this month
        await q("sponsor_opportunity_board")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("month", monthStr);

        const { error } = await q("sponsor_opportunity_board").insert(top);
        if (error) throw error;
      }

      return { generated: top.length, month: monthStr };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor-opportunity-board"] }),
  });
}

export function useUpdateOpportunityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await q("sponsor_opportunity_board")
        .update({ outreach_status: status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor-opportunity-board"] }),
  });
}
