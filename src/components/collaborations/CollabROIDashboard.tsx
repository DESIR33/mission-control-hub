import { useMemo } from "react";
import {
  TrendingUp,
  Users,
  Trophy,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Repeat,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useCollaborationROIScores,
  useCollabSummaryStats,
  type CollaborationROI,
} from "@/hooks/use-collaboration-roi";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatGain(n: number): string {
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}${formatNumber(n)}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-muted-foreground";
}

function getScoreProgressClass(score: number): string {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-muted-foreground";
}

function getCollabTypeBadge(type: string | null): string {
  switch (type) {
    case "guest":
      return "Guest";
    case "interview":
      return "Interview";
    case "collab_video":
      return "Collab Video";
    case "shoutout":
      return "Shoutout";
    case "cross_promo":
      return "Cross Promo";
    default:
      return type ?? "Other";
  }
}

export function CollabROIDashboard() {
  const { data: roiData, isLoading: roiLoading } = useCollaborationROIScores();
  const { data: stats, isLoading: statsLoading } = useCollabSummaryStats();

  if (roiLoading || statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading ROI data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.publishedCollabs === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Collaboration ROI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No published collaborations yet. Complete a collab to see ROI metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Collabs
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalCollabs}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.publishedCollabs} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Subs Gained
              </p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {formatGain(stats.totalSubsGained)}
            </p>
            <p className="text-xs text-muted-foreground">
              avg {formatGain(stats.avgSubsPerCollab)} per collab
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Avg ROI
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.avgROI}%
            </p>
            <p className="text-xs text-muted-foreground">
              actual vs expected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Best Partner
              </p>
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {stats.bestCollab?.collaboration.creator_name ?? "N/A"}
            </p>
            <p className="text-xs text-emerald-400">
              {stats.bestCollab
                ? formatGain(stats.bestCollab.actualSubGain) + " subs"
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat className="w-4 h-4 text-primary" />
            Collaborations Ranked by Re-Collab Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <div className="col-span-3">Creator</div>
              <div className="col-span-1 text-right">Subs</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2 text-right">Expected</div>
              <div className="col-span-1 text-right">Actual</div>
              <div className="col-span-1 text-right">ROI</div>
              <div className="col-span-3">Re-Collab Score</div>
            </div>

            {/* Rows */}
            {roiData.map((item) => (
              <CollabROIRow key={item.collaboration.id} item={item} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CollabROIRow({ item }: { item: CollaborationROI }) {
  const { collaboration, actualSubGain, expectedSubGain, roi, reCollabScore } =
    item;
  const exceeded = actualSubGain >= expectedSubGain && expectedSubGain > 0;
  const gainColor = exceeded ? "text-emerald-400" : "text-red-400";
  const GainIcon = exceeded ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 py-3 rounded-md border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors items-center">
      {/* Creator Name */}
      <div className="sm:col-span-3 flex items-center gap-2">
        <span className="text-sm font-medium text-foreground truncate">
          {collaboration.creator_name}
        </span>
      </div>

      {/* Subscriber Count */}
      <div className="sm:col-span-1 text-right">
        <span className="text-xs text-muted-foreground sm:text-sm">
          {collaboration.subscriber_count
            ? formatNumber(collaboration.subscriber_count)
            : "—"}
        </span>
      </div>

      {/* Collab Type */}
      <div className="sm:col-span-1">
        <Badge variant="outline" className="text-xs">
          {getCollabTypeBadge(collaboration.collab_type)}
        </Badge>
      </div>

      {/* Expected Gain */}
      <div className="sm:col-span-2 text-right">
        <span className="text-xs text-muted-foreground">
          {expectedSubGain > 0 ? formatGain(expectedSubGain) : "—"}
        </span>
      </div>

      {/* Actual Gain */}
      <div className="sm:col-span-1 text-right flex items-center justify-end gap-1">
        <GainIcon className={`w-3 h-3 ${gainColor}`} />
        <span className={`text-sm font-medium ${gainColor}`}>
          {formatGain(actualSubGain)}
        </span>
      </div>

      {/* ROI */}
      <div className="sm:col-span-1 text-right">
        <span
          className={`text-sm font-mono font-medium ${
            roi >= 100 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {expectedSubGain > 0 ? `${roi}%` : "—"}
        </span>
      </div>

      {/* Re-Collab Score */}
      <div className="sm:col-span-3 flex items-center gap-2">
        <Progress
          value={reCollabScore}
          className={`h-2 flex-1 ${getScoreProgressClass(reCollabScore)}`}
        />
        <span
          className={`text-sm font-mono font-bold w-8 text-right ${getScoreColor(reCollabScore)}`}
        >
          {reCollabScore}
        </span>
      </div>
    </div>
  );
}
