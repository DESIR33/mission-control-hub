import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Flame,
  Building2,
  User2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useSponsorPipeline, type SponsorDeal, type SponsorPipelineStage } from "@/hooks/use-sponsor-pipeline";
import { useSponsorMatchScore } from "@/hooks/use-sponsor-match-score";
import { Skeleton } from "@/components/ui/skeleton";
import { safeFormat } from "@/lib/date-utils";

const SPONSOR_STAGES: { id: SponsorPipelineStage; label: string; color: string }[] = [
  { id: "discovered", label: "Discovered", color: "#3B82F6" },
  { id: "contacted", label: "Contacted", color: "#6366F1" },
  { id: "responded", label: "Responded", color: "#8B5CF6" },
  { id: "negotiating", label: "Negotiating", color: "#F59E0B" },
  { id: "closed", label: "Closed", color: "#10B981" },
];

const formatCurrency = (value: number | null, currency?: string | null) => {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SponsorPipelineView() {
  const { dealsByStage, metrics, isLoading } = useSponsorPipeline();
  const { data: matchScores = [] } = useSponsorMatchScore();

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of matchScores) {
      map.set(s.companyId, s.matchScore);
    }
    return map;
  }, [matchScores]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Pipeline Value</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{metrics.dealCount} sponsor deals</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Weighted Forecast</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.weightedForecast)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Based on stage probability</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Hot Leads</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{metrics.hotLeadsCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Contacts opened emails 2+ times</p>
        </motion.div>
      </div>

      {/* Kanban Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {SPONSOR_STAGES.map((stage) => {
          const stageDeals = dealsByStage[stage.id] ?? [];
          const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg p-3 bg-muted/30 min-h-[200px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-medium text-xs truncate">{stage.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {stageDeals.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {formatCurrency(stageTotal)}
              </p>

              <div className="space-y-2">
                {stageDeals.map((deal) => {
                  const companyScore = deal.company_id ? scoreMap.get(deal.company_id) : null;

                  return (
                    <SponsorDealCard
                      key={deal.id}
                      deal={deal}
                      matchScore={companyScore ?? null}
                    />
                  );
                })}

                {stageDeals.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No deals
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SponsorDealCard({
  deal,
  matchScore,
}: {
  deal: SponsorDeal;
  matchScore: number | null;
}) {
  const scoreColor =
    matchScore != null
      ? matchScore >= 70
        ? "bg-green-500/15 text-green-600 border-green-500/30"
        : matchScore >= 40
        ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
        : "bg-gray-500/15 text-gray-500 border-gray-500/30"
      : "";

  return (
    <div className="p-2.5 rounded-lg border bg-card hover:border-primary cursor-pointer transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        <h4 className="text-xs font-medium leading-tight line-clamp-2 flex-1">
          {deal.title}
        </h4>
        {deal.isHotLead && (
          <span title="Hot lead - 2+ email opens"><Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /></span>
        )}
        {matchScore != null && (
          <Badge variant="outline" className={`text-xs shrink-0 ${scoreColor}`}>
            {matchScore}pt
          </Badge>
        )}
      </div>

      {deal.value != null && (
        <p className="text-xs font-semibold text-primary mb-1.5">
          {formatCurrency(deal.value, deal.currency)}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {deal.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground" title={deal.company.name}>
            <Building2 className="w-2.5 h-2.5" />
            <span className="truncate max-w-[80px]">{deal.company.name}</span>
          </div>
        )}
        {deal.contact && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User2 className="w-2.5 h-2.5" />
            <span className="truncate max-w-[60px]">{deal.contact.first_name}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Calendar className="w-2.5 h-2.5" />
            <span>{safeFormat(deal.expected_close_date, "MMM d")}</span>
          </div>
        )}
      </div>

      {deal.emailOpens > 0 && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          {deal.emailOpens} email open{deal.emailOpens !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
