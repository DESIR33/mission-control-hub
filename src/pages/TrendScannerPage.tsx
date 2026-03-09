import { useState } from "react";
import { useTrendReports, useTriggerScan, useConvertToVideoIdea, type VideoIdea, type TrendReport } from "@/hooks/use-trend-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Flame, Eye, ArrowRight, Clock, Zap, TrendingUp, Sparkles, ChevronLeft, ExternalLink, Heart, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  "New Tool": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "New Feature": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "AI Launch": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Industry Trend": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Tutorial Opportunity": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Breaking News": "bg-red-500/15 text-red-400 border-red-500/30",
  "Hot Take": "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const urgencyConfig = {
  high: { label: "🔥 Record ASAP", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  medium: { label: "⏰ This Week", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low: { label: "📋 Backlog", className: "bg-muted text-muted-foreground border-border" },
};

function IdeaCard({ idea, onConvert, isConverting }: { idea: VideoIdea; onConvert: () => void; isConverting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const urg = urgencyConfig[idea.urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-border/60",
        expanded && "ring-1 ring-primary/20"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-xs font-medium", typeColors[idea.type] || "")}>
                {idea.type}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", urg.className)}>
                {urg.label}
              </Badge>
            </div>
            <CardTitle className="text-base leading-tight">{idea.title}</CardTitle>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">{idea.tool_name}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold text-foreground">
                {idea.estimated_views >= 1000000
                  ? `${(idea.estimated_views / 1000000).toFixed(1)}M`
                  : idea.estimated_views >= 1000
                  ? `${(idea.estimated_views / 1000).toFixed(0)}K`
                  : idea.estimated_views.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">est. views</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>

        {expanded && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Content Ideas</h4>
              <ul className="space-y-1.5">
                {idea.content_ideas.map((ci, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{ci}</span>
                  </li>
                ))}
              </ul>
            </div>

            {idea.source_tweets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Source Tweets</h4>
                <div className="space-y-2">
                  {idea.source_tweets.slice(0, 3).map((tw, i) => (
                    <div key={i} className="bg-muted/40 rounded-lg p-3 text-sm border border-border/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">@{tw.author}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tw.likes}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{tw.impressions?.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-3">{tw.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onConvert();
              }}
              disabled={isConverting}
            >
              <ArrowRight className="w-4 h-4" />
              Add to Content Pipeline
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReportSelector({
  reports,
  selectedId,
  onSelect,
}: {
  reports: TrendReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-1.5 p-1">
        {reports.map((r) => {
          const ideasCount = r.content?.ideas?.length ?? 0;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm",
                selectedId === r.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-muted/60 text-foreground border border-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{ideasCount} ideas</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {r.content?.tweets_total ?? 0} tweets analyzed
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default function TrendScannerPage() {
  const { data: reports, isLoading } = useTrendReports();
  const triggerScan = useTriggerScan();
  const convertToVideo = useConvertToVideoIdea();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const selectedReport = reports?.find((r) => r.id === selectedReportId) ?? reports?.[0] ?? null;
  const ideas = selectedReport?.content?.ideas ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Trend Scanner</h1>
            <p className="text-xs text-muted-foreground">Video ideas from your X list • Last 48 hours</p>
          </div>
        </div>
        <Button
          onClick={() => triggerScan.mutate()}
          disabled={triggerScan.isPending}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", triggerScan.isPending && "animate-spin")} />
          {triggerScan.isPending ? "Scanning..." : "Scan Now"}
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Report list sidebar */}
        {reports && reports.length > 1 && (
          <div className="w-56 border-r border-border shrink-0 py-2">
            <ReportSelector
              reports={reports}
              selectedId={selectedReport?.id ?? null}
              onSelect={setSelectedReportId}
            />
          </div>
        )}

        {/* Ideas grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading reports...
              </div>
            ) : !selectedReport ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Flame className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-1">No Trend Reports Yet</h2>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Click "Scan Now" to analyze your X list and discover trending video opportunities.
                </p>
                <Button onClick={() => triggerScan.mutate()} disabled={triggerScan.isPending} className="gap-2">
                  <Zap className="w-4 h-4" />
                  Run First Scan
                </Button>
              </div>
            ) : (
              <>
                {/* Report summary bar */}
                <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(selectedReport.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {selectedReport.content?.tweets_total ?? 0} tweets
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {ideas.length} ideas
                  </span>
                </div>

                {ideas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10">No ideas were extracted from this scan.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ideas.map((idea, idx) => (
                      <IdeaCard
                        key={idx}
                        idea={idea}
                        onConvert={() => convertToVideo.mutate(idea)}
                        isConverting={convertToVideo.isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
