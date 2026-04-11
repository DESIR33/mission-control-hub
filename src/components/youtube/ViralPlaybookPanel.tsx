import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  usePlaybookRuns,
  usePlaybookChecklist,
  useConversionAssets,
  useToggleChecklistItem,
  useUpdateAssetStatus,
  useCompletePlaybookRun,
  type PlaybookRun,
} from "@/hooks/use-viral-playbook";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Flame, CheckCircle2, FileText, MessageSquare, Share2, Mail,
  Eye, Users, DollarSign, TrendingUp, Clock, ExternalLink,
} from "lucide-react";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground",
  paused: "bg-warning/15 text-warning border-warning/30",
};

const assetIcons: Record<string, typeof FileText> = {
  pinned_comment: MessageSquare,
  description_update: FileText,
  newsletter_draft: Mail,
  social_snippet: Share2,
};

const assetStatusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/15 text-primary border-primary/30",
  published: "bg-success/15 text-success border-success/30",
};

const categoryColors: Record<string, string> = {
  engagement: "text-primary",
  seo: "text-warning",
  newsletter: "text-destructive",
  social: "text-success",
  revenue: "text-primary",
  general: "text-muted-foreground",
};

export function ViralPlaybookPanel() {
  const { data: runs = [], isLoading } = usePlaybookRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      {/* Active Runs */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            Viral Playbook Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-6">
              <Flame className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No playbook runs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Runs trigger automatically when videos cross the virality threshold (75+)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedRunId === run.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className={cn("w-3.5 h-3.5 shrink-0",
                          run.viral_score >= 85 ? "text-destructive" : "text-warning"
                        )} />
                        <p className="text-sm font-semibold text-foreground truncate">
                          {run.video_title || run.youtube_video_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Score: {run.viral_score}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {run.views_at_trigger.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {safeFormatDistanceToNow(run.started_at, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0", statusStyles[run.status])}>
                      {run.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Run Detail */}
      {selectedRun && (
        <PlaybookRunDetail run={selectedRun} />
      )}
    </div>
  );
}

function PlaybookRunDetail({ run }: { run: PlaybookRun }) {
  const { data: checklist = [] } = usePlaybookChecklist(run.id);
  const { data: assets = [] } = useConversionAssets(run.id);
  const toggleItem = useToggleChecklistItem();
  const updateAsset = useUpdateAssetStatus();
  const completeRun = useCompletePlaybookRun();
  const { toast } = useToast();
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);

  const completedCount = checklist.filter((c) => c.is_completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleComplete = async () => {
    try {
      await completeRun.mutateAsync(run.id);
      toast({ title: "Playbook run completed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const viewedAsset = assets.find((a) => a.id === previewAsset);

  return (
    <>
      {/* Performance Tracker */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Performance Tracker
            </CardTitle>
            {run.status === "active" && (
              <Button size="sm" variant="outline" onClick={handleComplete} className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete Run
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                {(run.views_current || run.views_at_trigger).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Views</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{run.subs_gained}</p>
              <p className="text-[10px] text-muted-foreground">Subs Gained</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <TrendingUp className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{run.leads_generated}</p>
              <p className="text-[10px] text-muted-foreground">Leads</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <DollarSign className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                ${Number(run.revenue_attributed).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist" className="space-y-3">
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="checklist" className="text-xs">
            Checklist ({completedCount}/{totalCount})
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs">
            Assets ({assets.length})
          </TabsTrigger>
        </TabsList>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Launch Checklist</CardTitle>
                <span className="text-xs text-muted-foreground font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={(checked) =>
                        toggleItem.mutate({ id: item.id, completed: !!checked })
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        item.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", categoryColors[item.category])}>
                      {item.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Conversion Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assets.map((asset) => {
                  const Icon = assetIcons[asset.asset_type] ?? FileText;
                  return (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{asset.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {asset.asset_type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={cn("text-[10px]", assetStatusStyles[asset.status])}>
                          {asset.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setPreviewAsset(asset.id)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        {asset.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateAsset.mutate({ id: asset.id, status: "ready" })}
                          >
                            Ready
                          </Button>
                        )}
                        {asset.status === "ready" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateAsset.mutate({ id: asset.id, status: "published" })}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{viewedAsset?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            readOnly
            value={viewedAsset?.content ?? ""}
            className="min-h-[200px] bg-secondary border-border text-sm font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(viewedAsset?.content ?? "");
              }}
            >
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
