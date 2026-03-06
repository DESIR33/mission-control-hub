import { useState } from "react";
import {
  Filter,
  Users,
  Eye,
  MousePointerClick,
  UserPlus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSubscriberFunnel,
  type FunnelRange,
} from "@/hooks/use-subscriber-funnel";
import { useDeals } from "@/hooks/use-deals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const funnelColors = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#22c55e",
];

const funnelIcons = [Filter, Eye, MousePointerClick, UserPlus, Users, DollarSign];

const rangeOptions: { label: string; value: FunnelRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function conversionRate(from: number, to: number): string {
  if (from === 0) return "0%";
  return `${((to / from) * 100).toFixed(1)}%`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function AudienceFunnel() {
  const [range, setRange] = useState<FunnelRange>("30d");
  const { workspaceId } = useWorkspace();
  const { data: funnelData, isLoading } = useSubscriberFunnel(range);
  const { data: deals = [] } = useDeals();

  const { data: contactCount = 0 } = useQuery({
    queryKey: ["funnel-contacts", workspaceId],
    queryFn: async () => {
      const { count } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!);
      return count ?? 0;
    },
    enabled: !!workspaceId,
  });

  const closedWonCount = deals.filter((d) => d.stage === "closed_won").length;

  // Build the full funnel stages including Leads and Customers
  const fullFunnel = [
    ...(funnelData?.funnel ?? []),
    {
      label: "Leads",
      value: contactCount,
      previousValue: 0,
      changePercent: 0,
    },
    {
      label: "Customers",
      value: closedWonCount,
      previousValue: 0,
      changePercent: 0,
    },
  ];

  const maxValue = Math.max(...fullFunnel.map((s) => s.value), 1);

  const magnetVideos = [...(funnelData?.magnetVideos ?? [])].sort(
    (a, b) => b.conversion_rate - a.conversion_rate
  );

  const trafficConversions = funnelData?.trafficConversions ?? [];
  const maxTrafficViews = Math.max(...trafficConversions.map((t) => t.views), 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Audience Funnel & Lead Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Audience Funnel & Lead Scoring
        </CardTitle>
        <div className="flex gap-1">
          {rangeOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={range === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual Funnel */}
        <div className="space-y-1">
          {fullFunnel.map((step, i) => {
            const Icon = funnelIcons[i] ?? Filter;
            const widthPercent = Math.max((step.value / maxValue) * 100, 12);
            const showConversion =
              i > 0 && fullFunnel[i - 1].value > 0;

            return (
              <div key={step.label}>
                {showConversion && (
                  <div className="flex items-center justify-center gap-1 py-0.5 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3" />
                    {conversionRate(fullFunnel[i - 1].value, step.value)}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div
                      className="relative mx-auto flex items-center gap-2 rounded-md px-3 py-2 text-white transition-all"
                      style={{
                        backgroundColor: funnelColors[i] ?? funnelColors[0],
                        width: `${widthPercent}%`,
                        minWidth: "fit-content",
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {step.label}
                      </span>
                      <span className="ml-auto text-sm font-bold whitespace-nowrap">
                        {formatNumber(step.value)}
                      </span>
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    {step.changePercent !== 0 ? (
                      <Badge
                        variant={step.changePercent > 0 ? "default" : "destructive"}
                        className="gap-0.5 text-xs"
                      >
                        {step.changePercent > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(step.changePercent).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Converting Videos */}
        {magnetVideos.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold">Top Converting Videos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium text-right">Views</th>
                    <th className="pb-2 pr-4 font-medium text-right">Subs Gained</th>
                    <th className="pb-2 font-medium text-right">Conv / 1K Views</th>
                  </tr>
                </thead>
                <tbody>
                  {magnetVideos.slice(0, 8).map((video) => (
                    <tr
                      key={video.youtube_video_id}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4" title={video.title}>
                        {truncate(video.title, 40)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(video.views)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(video.subscribers_gained)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {video.conversion_rate.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Traffic Source Breakdown */}
        {trafficConversions.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold">Traffic Source Breakdown</h4>
            <div className="space-y-2">
              {trafficConversions.map((source) => {
                const barWidth = (source.views / maxTrafficViews) * 100;
                return (
                  <div key={source.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize">
                        {source.source.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {formatNumber(source.views)} views &middot;{" "}
                        ~{formatNumber(source.estimated_subs)} subs &middot;{" "}
                        {source.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
