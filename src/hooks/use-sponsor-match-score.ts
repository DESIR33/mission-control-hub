import { useMemo } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useDeals } from "@/hooks/use-deals";
import { safeGetTime } from "@/lib/date-utils";

export interface ScoredCompany {
  companyId: string;
  companyName: string;
  matchScore: number;
  breakdown: {
    industryAlignment: number;
    dealHistory: number;
    sizeFit: number;
    engagementReadiness: number;
    recency: number;
    revenuePotential: number;
  };
}

export function useSponsorMatchScore() {
  const { data: companies = [] } = useCompanies();
  const { data: deals = [] } = useDeals();

  const scored = useMemo((): ScoredCompany[] => {
    const dealsByCompany = new Map<string, any[]>();
    for (const deal of deals) {
      const cid = (deal as any).company_id;
      if (cid) {
        const existing = dealsByCompany.get(cid) ?? [];
        existing.push(deal);
        dealsByCompany.set(cid, existing);
      }
    }

    const avgDealValue = deals.length > 0
      ? deals.reduce((s, d) => s + (Number((d as any).value) || 0), 0) / deals.length
      : 0;

    return companies.map((company: any) => {
      let industryAlignment = 8;
      const techIndustries = ["technology", "software", "saas", "media", "entertainment", "digital", "gaming"];
      if (company.industry && techIndustries.some((t) => company.industry.toLowerCase().includes(t))) {
        industryAlignment = 15;
      } else if (company.industry) {
        industryAlignment = 10;
      }

      // Deal history (25 pts)
      const companyDeals = dealsByCompany.get(company.id) ?? [];
      const wonDeals = companyDeals.filter((d: any) => d.stage === "closed_won");
      let dealHistory = 0;
      if (wonDeals.length > 2) dealHistory = 25;
      else if (wonDeals.length > 0) dealHistory = 18;
      else if (companyDeals.length > 0) dealHistory = 10;

      // Size fit (15 pts) - mid-market best for 21K-50K channel
      let sizeFit = 8;
      const size = (company.size ?? "").toLowerCase();
      if (size.includes("51-200") || size.includes("201-500") || size.includes("mid")) {
        sizeFit = 15;
      } else if (size.includes("11-50") || size.includes("501-1000")) {
        sizeFit = 12;
      }

      // Engagement readiness (20 pts)
      let engagementReadiness = 5;
      if (company.social_youtube) engagementReadiness += 8;
      if (company.social_instagram) engagementReadiness += 4;
      if (company.social_linkedin) engagementReadiness += 3;

      // Recency (10 pts)
      let recency = 0;
      const recentDeals = companyDeals.filter((d: any) => {
        const date = d.updated_at || d.created_at;
        if (!date) return false;
        const daysSince = (Date.now() - safeGetTime(date)) / (1000 * 60 * 60 * 24);
        return daysSince < 90;
      });
      if (recentDeals.length > 0) recency = 10;
      else if (companyDeals.length > 0) recency = 5;

      // Revenue potential (15 pts)
      let revenuePotential = 7;
      const companyDealValue = wonDeals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);
      if (companyDealValue > avgDealValue * 1.5) revenuePotential = 15;
      else if (companyDealValue > avgDealValue) revenuePotential = 12;
      else if (company.revenue) revenuePotential = 10;

      const matchScore = industryAlignment + dealHistory + sizeFit + engagementReadiness + recency + revenuePotential;

      return {
        companyId: company.id,
        companyName: company.name,
        matchScore: Math.min(matchScore, 100),
        breakdown: {
          industryAlignment,
          dealHistory,
          sizeFit,
          engagementReadiness,
          recency,
          revenuePotential,
        },
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [companies, deals]);

  return { data: scored };
}
