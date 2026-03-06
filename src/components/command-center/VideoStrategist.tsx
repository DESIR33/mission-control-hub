import { useState } from "react";
import {
  Sparkles, Check, X, Image, RefreshCw, Loader2,
  Bell, ChevronDown, ChevronUp, FlaskConical, History,
  Type, FileText, Tags, TrendingUp, AlertTriangle, Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePendingOptimizations,
  useApproveOptimization,
  useDismissOptimization,
  useGenerateThumbnail,
  useActiveExperiments,
  useExperimentHistory,
  useRollbackExperiment,
  useStrategistNotifications,
  useMarkNotificationRead,
  useTriggerStrategistRun,
} from "@/hooks/use-video-strategist";
import { ExperimentCard } from "./ExperimentCard";
import { OPTIMIZATION_TYPE_LABELS } from "@/types/strategist";
import type { VideoOptimizationProposal } from "@/types/strategist";

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const typeIcons: Record<string, typeof Type> = {
  video_title_optimization: Type,
  video_description_optimization: FileText,
  video_tags_optimization: Tags,
  video_thumbnail_optimization: Image,
};

function ProofSection({ proof }: { proof: VideoOptimizationProposal["optimization_proof"] }) {
  const [expanded, setExpanded] = useState(false);
  if (!proof) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide proof" : "Show data proof"}
      </button>
      {expanded && (
        <div className="mt-2 text-xs space-y-2 bg-muted/50 rounded-lg p-3">
          {proof.current_metrics && (
            <div>
              <span className="font-medium text-foreground">Current Metrics: </span>
              <span className="text-muted-foreground">
                {fmtNumber(proof.current_metrics.views_30d)} views (30d),{" "}
                {proof.current_metrics.ctr?.toFixed(1)}% CTR,{" "}
                {fmtNumber(proof.current_metrics.impressions)} impressions,{" "}
                P{proof.current_metrics.percentile} percentile
              </span>
            </div>
          )}
          {proof.channel_average && (
            <div>
              <span className="font-medium text-foreground">Channel Average: </span>
              <span className="text-muted-foreground">
                {fmtNumber(proof.channel_average.views_30d)} views, {proof.channel_average.ctr?.toFixed(1)}% CTR
              </span>
            </div>
          )}
          {proof.competitor_comparison && (
            <div>
              <span className="font-medium text-foreground">Competitor Insight: </span>
              <span className="text-muted-foreground">{proof.competitor_comparison}</span>
            </div>
          )}
          {proof.youtube_best_practices && (
            <div>
              <span className="font-medium text-foreground">Best Practice: </span>
              <span className="text-muted-foreground">{proof.youtube_best_practices}</span>
            </div>
          )}
          {proof.expected_impact && (
            <div>
              <span className="font-medium text-green-400">Expected Impact: </span>
              <span className="text-muted-foreground">{proof.expected_impact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ proposal }: { proposal: VideoOptimizationProposal }) {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const approve = useApproveOptimization();
  const dismiss = useDismissOptimization();
  const generateThumb = useGenerateThumbnail();

  const Icon = typeIcons[proposal.proposal_type] || Sparkles;
  const typeLabel = OPTIMIZATION_TYPE_LABELS[proposal.proposal_type] || "Optimization";
  const changes = proposal.proposed_changes || {};
  const titles = (changes.titles as string[]) || [];
  const isThumbnail = proposal.proposal_type === "video_thumbnail_optimization";
  const needsThumbnailGen = isThumbnail && proposal.requires_thumbnail_generation && !proposal.thumbnail_urls?.length;

  return (
    <Card className="transition-all hover:ring-1 hover:ring-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wide">{typeLabel}</span>
            </div>
            <CardTitle className="text-sm font-semibold leading-snug">{proposal.title}</CardTitle>
          </div>
          <Badge className="shrink-0 text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-400/30">
            {Math.round(proposal.confidence * 100)}% conf
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary */}
        {proposal.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">{proposal.summary}</p>
        )}

        {/* Title options */}
        {titles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-foreground uppercase tracking-wide">Recommended Titles</p>
            {titles.map((title, i) => (
              <button
                key={i}
                onClick={() => setSelectedTitle(title)}
                className={`w-full text-left text-xs p-2 rounded border transition-all ${
                  selectedTitle === title
                    ? "border-blue-400 bg-blue-400/10 text-foreground"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                }`}
              >
                <span className="font-medium text-muted-foreground mr-1.5">#{i + 1}</span>
                {title}
              </button>
            ))}
          </div>
        )}

        {/* Thumbnail prompts */}
        {isThumbnail && proposal.thumbnail_prompts?.length ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-foreground uppercase tracking-wide">Thumbnail Concepts</p>
            {proposal.thumbnail_prompts.map((prompt, i) => (
              <div key={i} className="text-xs text-muted-foreground p-2 rounded border border-border">
                {prompt}
              </div>
            ))}
          </div>
        ) : null}

        {/* Generated thumbnails */}
        {proposal.thumbnail_urls?.length ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-foreground uppercase tracking-wide">Generated Thumbnails</p>
            <div className="grid grid-cols-2 gap-2">
              {proposal.thumbnail_urls.map((url, i) => (
                <img key={i} src={url} alt={`Thumbnail option ${i + 1}`} className="rounded border border-border w-full aspect-video object-cover" />
              ))}
            </div>
          </div>
        ) : null}

        {/* Tags */}
        {(changes.tags as string[])?.length ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-foreground uppercase tracking-wide">Recommended Tags</p>
            <div className="flex flex-wrap gap-1">
              {(changes.tags as string[]).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* Description */}
        {changes.description && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-foreground uppercase tracking-wide">Recommended Description</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto p-2 rounded border border-border">
              {changes.description as string}
            </p>
          </div>
        )}

        {/* Proof section */}
        <ProofSection proof={proposal.optimization_proof} />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {needsThumbnailGen && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              disabled={generateThumb.isPending}
              onClick={() => {
                const prompt = proposal.thumbnail_prompts?.[0];
                if (prompt) generateThumb.mutate({ proposalId: proposal.id, prompt });
              }}
            >
              {generateThumb.isPending ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Image className="w-3 h-3 mr-1.5" />
              )}
              Generate Thumbnail
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs flex-1"
            disabled={approve.isPending || (titles.length > 0 && !selectedTitle) || (isThumbnail && needsThumbnailGen)}
            onClick={() => approve.mutate({
              proposalId: proposal.id,
              selectedOption: selectedTitle || undefined,
            })}
          >
            {approve.isPending ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Check className="w-3 h-3 mr-1.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate(proposal.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        {titles.length > 0 && !selectedTitle && (
          <p className="text-[10px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Select a title option above before approving
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function VideoStrategist() {
  const pending = usePendingOptimizations();
  const activeExperiments = useActiveExperiments();
  const experimentHistory = useExperimentHistory();
  const notifications = useStrategistNotifications();
  const markRead = useMarkNotificationRead();
  const rollback = useRollbackExperiment();
  const triggerRun = useTriggerStrategistRun();

  const unreadCount = notifications.data?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Video Optimization Strategist</h2>
            <p className="text-xs text-muted-foreground">
              AI-powered daily recommendations to optimize your existing videos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-400/30">
              <Bell className="w-3 h-3 mr-1" />
              {unreadCount}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerRun.mutate()}
            disabled={triggerRun.isPending}
          >
            {triggerRun.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.data?.map((n) => (
        <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Bell className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => markRead.mutate(n.id)}>
            Dismiss
          </Button>
        </div>
      ))}

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations" className="text-xs">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Recommendations
            {(pending.data?.length || 0) > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1.5 py-0 bg-blue-500/20 text-blue-400">
                {pending.data?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
            Active Experiments
            {(activeExperiments.data?.length || 0) > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1.5 py-0 bg-green-500/20 text-green-400">
                {activeExperiments.data?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {pending.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : !pending.data?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No pending recommendations. The strategist runs daily at 3:00 AM CST, or click "Run Now" to generate recommendations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.data.map((proposal) => (
                <RecommendationCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Experiments Tab */}
        <TabsContent value="active" className="space-y-4 mt-4">
          {activeExperiments.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : !activeExperiments.data?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No active experiments. Approve a recommendation to start tracking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeExperiments.data.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  onRollback={(id) => rollback.mutate(id)}
                  isRollingBack={rollback.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {experimentHistory.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : !experimentHistory.data?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No completed experiments yet. Results will appear here after the measurement period.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experimentHistory.data.map((exp) => (
                <ExperimentCard key={exp.id} experiment={exp} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
