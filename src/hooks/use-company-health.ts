import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const query = (table: string) => (supabase as any).from(table);

export interface CompanyHealthScore {
  id: string;
  workspace_id: string;
  company_id: string;
  overall_score: number;
  engagement_score: number;
  response_score: number;
  deal_velocity_score: number;
  revenue_score: number;
  recency_score: number;
  risk_level: "healthy" | "at_risk" | "churning";
  risk_factors: string[];
  last_calculated_at: string;
}

export function useCompanyHealthScores() {
  const { workspaceId } = useWorkspace();
  return useQuery<CompanyHealthScore[]>({
    queryKey: ["company-health-scores", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("company_health_scores")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("overall_score", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        risk_factors: Array.isArray(d.risk_factors) ? d.risk_factors : [],
      })) as CompanyHealthScore[];
    },
    enabled: !!workspaceId,
  });
}

export function useCompanyHealthScore(companyId: string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery<CompanyHealthScore | null>({
    queryKey: ["company-health-score", workspaceId, companyId],
    queryFn: async () => {
      if (!workspaceId || !companyId) return null;
      const { data, error } = await query("company_health_scores")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        risk_factors: Array.isArray(data.risk_factors) ? data.risk_factors : [],
      } as CompanyHealthScore;
    },
    enabled: !!workspaceId && !!companyId,
  });
}

export function useRecalculateHealthScore() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      if (!workspaceId) throw new Error("No workspace");

      // Calculate scores based on available data
      const riskFactors: string[] = [];

      // Check last contact date
      const { data: company } = await supabase
        .from("companies")
        .select("last_contact_date, created_at")
        .eq("id", companyId)
        .single();

      const daysSinceContact = company?.last_contact_date
        ? Math.floor((Date.now() - new Date(company.last_contact_date).getTime()) / 86400000)
        : 999;

      // Recency score
      let recencyScore = 100;
      if (daysSinceContact > 90) { recencyScore = 10; riskFactors.push("No contact in 90+ days"); }
      else if (daysSinceContact > 60) { recencyScore = 30; riskFactors.push("No contact in 60+ days"); }
      else if (daysSinceContact > 30) { recencyScore = 50; riskFactors.push("No contact in 30+ days"); }
      else if (daysSinceContact > 14) { recencyScore = 70; }

      // Deal velocity
      const { data: deals } = await supabase
        .from("deals")
        .select("stage, value, created_at")
        .eq("company_id", companyId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      const openDeals = (deals ?? []).filter(d => !["closed_won", "closed_lost"].includes(d.stage));
      const wonDeals = (deals ?? []).filter(d => d.stage === "closed_won");
      const lostDeals = (deals ?? []).filter(d => d.stage === "closed_lost");

      let dealVelocityScore = 50;
      if (openDeals.length > 0) dealVelocityScore = 80;
      if (wonDeals.length > 0) dealVelocityScore = Math.min(100, dealVelocityScore + 10);
      if (lostDeals.length > wonDeals.length && lostDeals.length > 0) {
        dealVelocityScore = Math.max(20, dealVelocityScore - 30);
        riskFactors.push("More lost deals than won");
      }

      // Revenue score
      const totalRevenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
      let revenueScore = 0;
      if (totalRevenue >= 10000) revenueScore = 100;
      else if (totalRevenue >= 5000) revenueScore = 80;
      else if (totalRevenue >= 1000) revenueScore = 60;
      else if (totalRevenue > 0) revenueScore = 40;
      else { riskFactors.push("No revenue generated"); }

      // Engagement (emails)
      const { count: emailCount } = await (supabase as any)
        .from("inbox_emails")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      let engagementScore = 50;
      if ((emailCount ?? 0) > 20) engagementScore = 90;
      else if ((emailCount ?? 0) > 10) engagementScore = 70;
      else if ((emailCount ?? 0) > 0) engagementScore = 50;
      else { engagementScore = 20; riskFactors.push("No email engagement"); }

      const responseScore = 60; // placeholder

      const overall = Math.round(
        recencyScore * 0.25 +
        dealVelocityScore * 0.2 +
        revenueScore * 0.25 +
        engagementScore * 0.2 +
        responseScore * 0.1
      );

      let riskLevel: "healthy" | "at_risk" | "churning" = "healthy";
      if (overall < 30) riskLevel = "churning";
      else if (overall < 50) riskLevel = "at_risk";

      const { error } = await query("company_health_scores")
        .upsert({
          workspace_id: workspaceId,
          company_id: companyId,
          overall_score: overall,
          engagement_score: engagementScore,
          response_score: responseScore,
          deal_velocity_score: dealVelocityScore,
          revenue_score: revenueScore,
          recency_score: recencyScore,
          risk_level: riskLevel,
          risk_factors: riskFactors,
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,company_id" });

      if (error) throw error;
      return { overall, riskLevel };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-health-scores"] });
      qc.invalidateQueries({ queryKey: ["company-health-score"] });
    },
  });
}
