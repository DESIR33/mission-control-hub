import { useMemo } from "react";
import {
  Handshake,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronRight,
  Mail,
  Users,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";

import { useDeals, useUpdateDeal, type Deal, type DealStage } from "@/hooks/use-deals";
import { useDealVelocity } from "@/hooks/use-deal-velocity";
import { useEmailSequences } from "@/hooks/use-email-sequences";

const STAGE_COLORS: Record<string, string> = {
  prospecting: "border-t-gray-400",
  qualification: "border-t-blue-400",
  proposal: "border-t-purple-400",
  negotiation: "border-t-yellow-400",
  closed_won: "border-t-green-400",
  closed_lost: "border-t-red-400",
};

const STAGE_ORDER: DealStage[] = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
];

const STAGE_LABELS: Record<DealStage, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const fmtCurrency = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

function getNextStage(current: DealStage): DealStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function SponsorPipeline() {
  const { data: deals, isLoading: dealsLoading } = useDeals();
  const { data: velocity, isLoading: velocityLoading } = useDealVelocity();
  const { data: sequences, isLoading: sequencesLoading } = useEmailSequences();
  const updateDeal = useUpdateDeal();

  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      prospecting: [],
      qualification: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };
    if (!deals) return grouped;
    for (const deal of deals) {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    }
    return grouped;
  }, [deals]);

  const metrics = useMemo(() => {
    if (!deals) return { totalPipeline: 0, winRate: 0, activeDeals: 0 };

    const activeStages: DealStage[] = ["prospecting", "qualification", "proposal", "negotiation"];
    const activeDeals = deals.filter((d) => activeStages.includes(d.stage));
    const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

    const closedWon = deals.filter((d) => d.stage === "closed_won").length;
    const closedLost = deals.filter((d) => d.stage === "closed_lost").length;
    const totalClosed = closedWon + closedLost;
    const winRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;

    return { totalPipeline, winRate, activeDeals: activeDeals.length };
  }, [deals]);

  const activeSequencesCount = useMemo(() => {
    if (!sequences) return 0;
    return sequences.filter((s) => s.status === "active").length;
  }, [sequences]);

  const handleAdvanceStage = (deal: Deal) => {
    const next = getNextStage(deal.stage);
    if (!next) return;
    updateDeal.mutate({ id: deal.id, stage: next });
  };

  const isLoading = dealsLoading || velocityLoading || sequencesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Sponsor Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          Sponsor Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline Metrics Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Pipeline
            </div>
            <p className="mt-1 text-xl font-bold">
              {fmtCurrency(metrics.totalPipeline)}
            </p>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Avg Velocity
            </div>
            <p className="mt-1 text-xl font-bold">
              {velocity?.avgCycleTime ?? 0} days
            </p>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Win Rate
            </div>
            <p className="mt-1 text-xl font-bold">{metrics.winRate}%</p>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Active Deals
            </div>
            <p className="mt-1 text-xl font-bold">{metrics.activeDeals}</p>
          </Card>
        </div>

        {/* Mini Kanban Board */}
        <div className="grid grid-cols-5 gap-3">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {dealsByStage[stage].length}
                </Badge>
              </div>

              <div className="space-y-2">
                {dealsByStage[stage].length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No deals
                  </p>
                )}

                {dealsByStage[stage].map((deal) => {
                  const daysInStage = differenceInDays(
                    new Date(),
                    new Date(deal.updated_at)
                  );
                  const nextStage = getNextStage(deal.stage);
                  const displayName =
                    deal.company?.name || deal.title;

                  return (
                    <Card
                      key={deal.id}
                      className={`border-t-2 p-2.5 ${STAGE_COLORS[deal.stage] ?? ""}`}
                    >
                      <p className="text-sm font-medium leading-tight truncate">
                        {displayName}
                      </p>

                      {deal.value != null && (
                        <p className="mt-1 text-xs font-semibold text-green-600">
                          {fmtCurrency(deal.value)}
                        </p>
                      )}

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {daysInStage}d in stage
                      </p>

                      {nextStage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1.5 h-6 w-full justify-between px-1.5 text-xs"
                          disabled={updateDeal.isPending}
                          onClick={() => handleAdvanceStage(deal)}
                        >
                          <span className="truncate">
                            {STAGE_LABELS[nextStage]}
                          </span>
                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sequence Health Summary */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Email Sequences</p>
            <p className="text-xs text-muted-foreground">
              {activeSequencesCount} active sequence{activeSequencesCount !== 1 ? "s" : ""} running
            </p>
          </div>
          <Badge variant={activeSequencesCount > 0 ? "default" : "secondary"}>
            {activeSequencesCount > 0 ? "Active" : "None"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
