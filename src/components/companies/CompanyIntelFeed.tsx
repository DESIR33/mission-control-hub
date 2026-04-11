import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompanyIntel, useMarkIntelRead } from "@/hooks/use-company-intel";
import { Radar, ExternalLink, Eye, EyeOff, Globe, MessageSquare, Rocket, Newspaper } from "lucide-react";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const typeIcons = {
  social_post: MessageSquare,
  product_launch: Rocket,
  content: Globe,
  news: Newspaper,
};

const typeColors = {
  social_post: "bg-primary/10 text-primary",
  product_launch: "bg-success/10 text-success",
  content: "bg-warning/10 text-warning",
  news: "bg-chart-4/10 text-chart-4",
};

export function CompanyIntelFeed({ companyId }: { companyId?: string }) {
  const { data: intel = [], isLoading } = useCompanyIntel(companyId);
  const markRead = useMarkIntelRead();

  if (isLoading) return null;
  if (intel.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 text-center">
          <Radar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No competitive intelligence yet</p>
          <p className="text-xs text-muted-foreground mt-1">Intel will appear when agents scan competitor activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Radar className="w-4 h-4 text-primary" /> Competitive Intelligence
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {intel.filter((i) => !i.is_read).length} new
        </Badge>
      </div>

      {intel.map((item) => {
        const Icon = typeIcons[item.intel_type as keyof typeof typeIcons] || Globe;
        const color = typeColors[item.intel_type as keyof typeof typeColors] || "bg-muted text-muted-foreground";

        return (
          <Card
            key={item.id}
            className={`border-border bg-card transition-colors ${!item.is_read ? "ring-1 ring-primary/20" : ""}`}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {!item.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {item.summary && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">{item.source}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{item.intel_type.replace(/_/g, " ")}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {safeFormatDistanceToNow(item.detected_at, { addSuffix: true })}
                  </span>
                </div>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    View source <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
