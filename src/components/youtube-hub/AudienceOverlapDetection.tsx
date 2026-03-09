import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudienceOverlapReports, useDismissOverlap } from "@/hooks/use-audience-overlap";
import { useVideoTitleMap } from "@/hooks/use-video-title-map";
import { Shuffle, X, Check, ArrowRight, Tag } from "lucide-react";

export function AudienceOverlapDetection() {
  const { data: overlaps = [], isLoading } = useAudienceOverlapReports();
  const dismiss = useDismissOverlap();
  const { getTitle } = useVideoTitleMap();

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-warning" /> Audience Overlap & Cannibalization
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Videos competing for the same audience or search terms</p>
        </div>
        <Badge variant="secondary" className="text-xs">{overlaps.length} detected</Badge>
      </div>

      {overlaps.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No audience cannibalization detected</p>
            <p className="text-xs text-muted-foreground mt-1">Your videos have well-differentiated audiences</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {overlaps.map((overlap) => (
            <Card key={overlap.id} className="border-border bg-card border-l-2 border-l-warning">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {getTitle(overlap.video_a_id)}
                      </p>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {getTitle(overlap.video_b_id)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                        {Math.round(overlap.overlap_score * 100)}% overlap
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {overlap.overlap_type}
                      </Badge>
                    </div>

                    {overlap.shared_keywords.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                        {overlap.shared_keywords.slice(0, 5).map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                        ))}
                      </div>
                    )}

                    {overlap.recommendation && (
                      <p className="text-xs text-primary mt-2 bg-primary/5 rounded-md px-2 py-1">
                        💡 {overlap.recommendation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-success"
                      onClick={() => dismiss.mutate({ id: overlap.id, status: "actioned" })}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => dismiss.mutate({ id: overlap.id, status: "dismissed" })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
