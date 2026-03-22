import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTopicPipelineImpact, useRecalculateTopicPipeline } from "@/hooks/use-topic-pipeline";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Flame, RefreshCw, Loader2, DollarSign, Target, Mail, MousePointer, MessageSquare, TrendingUp } from "lucide-react";

type SortKey = "revenue" | "pipeline" | "leads" | "clicks" | "opens";

import { useState } from "react";

function getHeatColor(value: number, max: number): string {
  if (max === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio >= 0.8) return "bg-destructive";
  if (ratio >= 0.6) return "bg-warning";
  if (ratio >= 0.4) return "bg-primary";
  if (ratio >= 0.2) return "bg-primary/60";
  return "bg-muted-foreground/20";
}

function getHeatTextColor(value: number, max: number): string {
  if (max === 0) return "text-muted-foreground";
  const ratio = value / max;
  if (ratio >= 0.6) return "text-destructive-foreground";
  return "text-foreground";
}

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const METRICS: { key: SortKey; label: string; icon: typeof DollarSign }[] = [
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "pipeline", label: "Pipeline", icon: Target },
  { key: "leads", label: "Leads", icon: TrendingUp },
  { key: "clicks", label: "Clicks", icon: MousePointer },
  { key: "opens", label: "Opens", icon: Mail },
];

export function TopicImpactHeatmap() {
  const { data: topics = [], isLoading } = useTopicPipelineImpact();
  const recalculate = useRecalculateTopicPipeline();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<SortKey>("revenue");

  const handleRecalculate = async () => {
    try {
      await recalculate.mutateAsync();
      toast({ title: "Topic pipeline impact recalculated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sorted = [...topics].sort((a, b) => {
    switch (sortBy) {
      case "revenue": return Number(b.closed_revenue) - Number(a.closed_revenue);
      case "pipeline": return Number(b.pipeline_value) - Number(a.pipeline_value);
      case "leads": return b.leads_generated - a.leads_generated;
      case "clicks": return b.total_clicked - a.total_clicked;
      case "opens": return b.total_opened - a.total_opened;
    }
  });

  const maxRevenue = Math.max(...topics.map(t => Number(t.closed_revenue)), 1);
  const maxPipeline = Math.max(...topics.map(t => Number(t.pipeline_value)), 1);
  const maxLeads = Math.max(...topics.map(t => t.leads_generated), 1);
  const maxClicks = Math.max(...topics.map(t => t.total_clicked), 1);
  const maxOpens = Math.max(...topics.map(t => t.total_opened), 1);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            Topic Impact Heatmap
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
            className="gap-1.5 text-xs"
          >
            {recalculate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Recalculate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Topics ranked by downstream pipeline & revenue impact</p>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="text-center py-8">
            <Flame className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No topic pipeline data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add topic tags to newsletter issues and recalculate</p>
          </div>
        ) : (
          <>
            {/* Sort controls */}
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Rank by:</span>
              {METRICS.map(m => (
                <Button
                  key={m.key}
                  variant={sortBy === m.key ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                  onClick={() => setSortBy(m.key)}
                >
                  <m.icon className="w-3 h-3" />
                  {m.label}
                </Button>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(5,minmax(52px,1fr))] gap-1 text-[10px] text-muted-foreground font-medium px-1">
                <span>Topic</span>
                <span className="text-center">Revenue</span>
                <span className="text-center">Pipeline</span>
                <span className="text-center">Leads</span>
                <span className="text-center">Clicks</span>
                <span className="text-center">Opens</span>
              </div>

              <TooltipProvider delayDuration={200}>
                {sorted.map((t, i) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1fr_repeat(5,minmax(52px,1fr))] gap-1 items-center"
                  >
                    {/* Topic name */}
                    <div className="flex items-center gap-1.5 min-w-0 px-1">
                      <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{t.topic}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {t.issues_count} issues
                      </Badge>
                    </div>

                    {/* Revenue cell */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "rounded-md py-1.5 text-center text-xs font-mono font-semibold",
                          getHeatColor(Number(t.closed_revenue), maxRevenue),
                          getHeatTextColor(Number(t.closed_revenue), maxRevenue)
                        )}>
                          {formatCurrency(Number(t.closed_revenue))}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{formatCurrency(Number(t.revenue_per_send))}/send</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Pipeline cell */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "rounded-md py-1.5 text-center text-xs font-mono font-semibold",
                          getHeatColor(Number(t.pipeline_value), maxPipeline),
                          getHeatTextColor(Number(t.pipeline_value), maxPipeline)
                        )}>
                          {formatCurrency(Number(t.pipeline_value))}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{formatCurrency(Number(t.pipeline_per_send))}/send</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Leads cell */}
                    <div className={cn(
                      "rounded-md py-1.5 text-center text-xs font-mono font-semibold",
                      getHeatColor(t.leads_generated, maxLeads),
                      getHeatTextColor(t.leads_generated, maxLeads)
                    )}>
                      {t.leads_generated}
                    </div>

                    {/* Clicks cell */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "rounded-md py-1.5 text-center text-xs font-mono font-semibold",
                          getHeatColor(t.total_clicked, maxClicks),
                          getHeatTextColor(t.total_clicked, maxClicks)
                        )}>
                          {t.total_clicked}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{Number(t.avg_click_rate).toFixed(1)}% click rate</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Opens cell */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "rounded-md py-1.5 text-center text-xs font-mono font-semibold",
                          getHeatColor(t.total_opened, maxOpens),
                          getHeatTextColor(t.total_opened, maxOpens)
                        )}>
                          {t.total_opened}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{Number(t.avg_open_rate).toFixed(1)}% open rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </TooltipProvider>
            </div>

            {/* Summary stats */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Total Revenue: <strong className="text-foreground">{formatCurrency(topics.reduce((s, t) => s + Number(t.closed_revenue), 0))}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Pipeline: <strong className="text-foreground">{formatCurrency(topics.reduce((s, t) => s + Number(t.pipeline_value), 0))}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {topics.reduce((s, t) => s + t.total_replied, 0)} replies
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
