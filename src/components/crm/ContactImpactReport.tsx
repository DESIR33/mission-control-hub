import {
  Film, DollarSign, TrendingUp, TrendingDown, Award, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContactImpact } from "@/hooks/use-contact-impact";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { VideoCompanyLogos } from "@/components/VideoCompanyLogos";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const fmtDollar = (n: number) => `$${n.toLocaleString()}`;

export function ContactImpactReport({ contactId }: { contactId: string }) {
  const { data: impact } = useContactImpact(contactId);
  const { lookup: companyLookup } = useAllVideoCompanies();

  if (!impact) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No linked content found for this contact.</p>
        <p className="text-xs mt-1">Link deals to video queue entries to see impact data.</p>
      </div>
    );
  }

  const scoreColor = impact.partnershipScore >= 120
    ? "text-green-400"
    : impact.partnershipScore >= 80
      ? "text-blue-400"
      : "text-yellow-400";

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtDollar(impact.totalRelationshipValue)}</p>
          <p className="text-xs text-muted-foreground">deal + ad revenue</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Film className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Videos</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{impact.linkedVideos.length}</p>
          <p className="text-xs text-muted-foreground">linked content</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Score</p>
          </div>
          <p className={`text-lg font-bold font-mono ${scoreColor}`}>{impact.partnershipScore}</p>
          <p className="text-xs text-muted-foreground">partnership score</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {impact.performanceVsAvg >= 100 ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider">vs Avg</p>
          </div>
          <p className={`text-lg font-bold font-mono ${impact.performanceVsAvg >= 100 ? "text-green-400" : "text-red-400"}`}>
            {impact.performanceVsAvg}%
          </p>
          <p className="text-xs text-muted-foreground">of channel avg</p>
        </div>
      </div>

      {/* Linked Videos Table */}
      {impact.linkedVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">Video</th>
                <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">Views</th>
                <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Subs</th>
                <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Revenue</th>
                <th className="text-right px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">vs Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {impact.linkedVideos.map((video) => (
                <tr key={video.youtubeVideoId}>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-foreground truncate max-w-[200px] flex items-center gap-1.5">
                      {video.title}
                      <VideoCompanyLogos companies={companyLookup.get(video.youtubeVideoId)} />
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs font-mono text-muted-foreground">{fmtCount(video.views)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">+{video.subsGained}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">{fmtDollar(video.estimatedRevenue)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant="outline" className={`text-xs ${
                      video.vsAvgViews >= 100
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                    }`}>
                      {video.vsAvgViews}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deal Revenue</p>
          <p className="text-sm font-bold font-mono text-foreground">{fmtDollar(impact.totalDealValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ad Revenue (from their videos)</p>
          <p className="text-sm font-bold font-mono text-foreground">{fmtDollar(impact.totalAdRevenue)}</p>
        </div>
      </div>
    </div>
  );
}
