import { useState } from "react";
import {
  Trophy,
  TrendingUp,
  Building2,
  Mail,
  Handshake,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useSponsorMatchScore,
  type ScoredCompany,
} from "@/hooks/use-sponsor-match-score";
import { useCreateDeal } from "@/hooks/use-deals";
import { usePitchGenerator } from "@/hooks/use-pitch-generator";
import { toast } from "sonner";

const BREAKDOWN_LABELS: Record<keyof ScoredCompany["breakdown"], { label: string; max: number }> = {
  industryAlignment: { label: "Industry Alignment", max: 15 },
  dealHistory: { label: "Deal History", max: 25 },
  sizeFit: { label: "Size Fit", max: 15 },
  engagementReadiness: { label: "Engagement Readiness", max: 20 },
  recency: { label: "Recency", max: 10 },
  revenuePotential: { label: "Revenue Potential", max: 15 },
};

function getScoreTier(score: number): {
  label: string;
  className: string;
  progressColor: string;
} {
  if (score >= 80)
    return {
      label: "Hot Lead",
      className: "bg-green-500/15 text-green-400 border-green-500/30",
      progressColor: "bg-green-500",
    };
  if (score >= 60)
    return {
      label: "Warm",
      className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      progressColor: "bg-yellow-500",
    };
  return {
    label: "Cold",
    className: "bg-muted text-muted-foreground border-border",
    progressColor: "bg-muted-foreground",
  };
}

function LeaderboardRow({
  company,
  rank,
}: {
  company: ScoredCompany;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const createDeal = useCreateDeal();
  const pitchGenerator = usePitchGenerator();

  const tier = getScoreTier(company.matchScore);

  const handleCreateDeal = async () => {
    try {
      await createDeal.mutateAsync({
        title: `Sponsorship — ${company.companyName}`,
        stage: "prospecting",
        company_id: company.companyId,
      });
      toast.success(`Deal created for ${company.companyName}`);
    } catch {
      toast.error("Failed to create deal");
    }
  };

  const handleGeneratePitch = async () => {
    try {
      const pitch = await pitchGenerator.mutateAsync({
        companyName: company.companyName,
        companyId: company.companyId,
        matchScore: company.matchScore,
      });
      await navigator.clipboard.writeText(pitch);
      toast.success("Pitch copied to clipboard!");
    } catch {
      toast.error("Failed to generate pitch");
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
          {rank <= 3 ? (
            <Trophy
              className={`w-4 h-4 ${
                rank === 1
                  ? "text-yellow-400"
                  : rank === 2
                    ? "text-gray-400"
                    : "text-amber-600"
              }`}
            />
          ) : (
            rank
          )}
        </div>

        {/* Company info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{company.companyName}</span>
            <Badge variant="outline" className={tier.className}>
              {tier.label}
            </Badge>
          </div>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2 w-36">
          <div className="flex-1">
            <Progress
              value={company.matchScore}
              className="h-2"
              style={
                {
                  "--progress-color": undefined,
                } as React.CSSProperties
              }
            />
          </div>
          <span className="text-sm font-mono font-bold w-8 text-right">
            {company.matchScore}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateDeal}
            disabled={createDeal.isPending}
            title="Create Deal"
          >
            <Handshake className="w-3.5 h-3.5 mr-1" />
            Deal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePitch}
            disabled={pitchGenerator.isPending}
            title="Generate Pitch Email"
          >
            <Mail className="w-3.5 h-3.5 mr-1" />
            Pitch
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t">
          {(
            Object.entries(BREAKDOWN_LABELS) as [
              keyof ScoredCompany["breakdown"],
              { label: string; max: number },
            ][]
          ).map(([key, meta]) => {
            const value = company.breakdown[key];
            const pct = Math.round((value / meta.max) * 100);
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{meta.label}</span>
                  <span>
                    {value}/{meta.max}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SponsorMatchLeaderboard() {
  const { data: scored } = useSponsorMatchScore();
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? scored : scored.slice(0, 10);

  const hotCount = scored.filter((c) => c.matchScore >= 80).length;
  const warmCount = scored.filter(
    (c) => c.matchScore >= 60 && c.matchScore < 80
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Sponsor Match Leaderboard
          </CardTitle>
          <div className="flex items-center gap-2">
            {hotCount > 0 && (
              <Badge
                variant="outline"
                className="bg-green-500/15 text-green-400 border-green-500/30"
              >
                <Zap className="w-3 h-3 mr-1" />
                {hotCount} Hot
              </Badge>
            )}
            {warmCount > 0 && (
              <Badge
                variant="outline"
                className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {warmCount} Warm
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {scored.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No companies to rank yet.</p>
            <p className="text-xs mt-1">
              Add companies to your CRM to see sponsor match scores.
            </p>
          </div>
        ) : (
          <>
            {displayed.map((company, i) => (
              <LeaderboardRow
                key={company.companyId}
                company={company}
                rank={i + 1}
              />
            ))}
            {scored.length > 10 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? "Show Top 10"
                  : `Show All ${scored.length} Companies`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
