import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useDeals, type Deal, type DealStage } from "@/hooks/use-deals";
import { useSponsorMatchScore } from "@/hooks/use-sponsor-match-score";

export type SponsorPipelineStage =
  | "discovered"
  | "contacted"
  | "responded"
  | "negotiating"
  | "closed";

const SPONSOR_STAGE_MAP: Record<DealStage, SponsorPipelineStage> = {
  prospecting: "discovered",
  qualification: "contacted",
  proposal: "responded",
  negotiation: "negotiating",
  closed_won: "closed",
  closed_lost: "closed",
};

export interface SponsorDeal extends Deal {
  matchScore: number | null;
  isHotLead: boolean;
  emailOpens: number;
  sponsorStage: SponsorPipelineStage;
}

export interface SponsorPipelineMetrics {
  totalValue: number;
  weightedForecast: number;
  hotLeadsCount: number;
  dealCount: number;
}

const STAGE_WEIGHTS: Record<SponsorPipelineStage, number> = {
  discovered: 0.1,
  contacted: 0.2,
  responded: 0.4,
  negotiating: 0.7,
  closed: 1.0,
};

export function useSponsorPipeline() {
  const { workspaceId } = useWorkspace();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: matchScores = [] } = useSponsorMatchScore();

  // Fetch email engagement data from sequence_send_log
  const { data: emailEngagement = [] } = useQuery({
    queryKey: ["sponsor-email-engagement", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_send_log" as any)
        .select("contact_id, opened_count")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as unknown as { contact_id: string; opened_count: number }[];
    },
    enabled: !!workspaceId,
  });

  // Build lookup of email opens per contact
  const emailOpensMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of emailEngagement) {
      const current = map.get(log.contact_id) ?? 0;
      map.set(log.contact_id, current + (log.opened_count ?? 0));
    }
    return map;
  }, [emailEngagement]);

  // Build match score lookup
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const score of matchScores) {
      map.set(score.companyId, score.matchScore);
    }
    return map;
  }, [matchScores]);

  // Filter to sponsor-related deals (deals that have a company_id)
  const sponsorDeals = useMemo((): SponsorDeal[] => {
    return deals
      .filter((deal) => deal.company_id != null)
      .map((deal) => {
        const matchScore = deal.company_id ? scoreMap.get(deal.company_id) ?? null : null;
        const emailOpens = deal.contact_id ? emailOpensMap.get(deal.contact_id) ?? 0 : 0;
        const isHotLead = emailOpens >= 2;
        const sponsorStage = SPONSOR_STAGE_MAP[deal.stage] ?? "discovered";

        return {
          ...deal,
          matchScore,
          isHotLead,
          emailOpens,
          sponsorStage,
        };
      });
  }, [deals, scoreMap, emailOpensMap]);

  // Group by sponsor pipeline stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<SponsorPipelineStage, SponsorDeal[]> = {
      discovered: [],
      contacted: [],
      responded: [],
      negotiating: [],
      closed: [],
    };
    for (const deal of sponsorDeals) {
      grouped[deal.sponsorStage].push(deal);
    }
    return grouped;
  }, [sponsorDeals]);

  // Pipeline metrics
  const metrics = useMemo((): SponsorPipelineMetrics => {
    let totalValue = 0;
    let weightedForecast = 0;
    let hotLeadsCount = 0;

    for (const deal of sponsorDeals) {
      if (deal.stage !== "closed_lost") {
        const value = deal.value ?? 0;
        totalValue += value;
        weightedForecast += value * (STAGE_WEIGHTS[deal.sponsorStage] ?? 0);
      }
      if (deal.isHotLead) hotLeadsCount++;
    }

    return {
      totalValue,
      weightedForecast,
      hotLeadsCount,
      dealCount: sponsorDeals.length,
    };
  }, [sponsorDeals]);

  return {
    sponsorDeals,
    dealsByStage,
    metrics,
    isLoading: dealsLoading,
  };
}
