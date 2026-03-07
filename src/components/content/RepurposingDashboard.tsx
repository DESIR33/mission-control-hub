import { useState } from "react";
import { Film, Youtube, Twitter, Linkedin, Mail, MessageCircle, Plus, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRepurposingWorkflow, useAutoGenerateRepurposes } from "@/hooks/use-repurposing-workflow";
import { useRepurposes, useUpdateRepurpose } from "@/hooks/use-repurposes";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  YouTube: <Youtube className="h-3.5 w-3.5" />,
  "Twitter/X": <Twitter className="h-3.5 w-3.5" />,
  LinkedIn: <Linkedin className="h-3.5 w-3.5" />,
  Newsletter: <Mail className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500/15 text-green-700 border-green-300",
  in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  planned: "bg-gray-500/15 text-gray-500 border-gray-300",
};

export default function RepurposingDashboard() {
  const { data: videos } = useVideoQueue();
  const { videoRepurposeMap, completionStats, overallCompletionRate } =
    useRepurposingWorkflow();
  const { generate, isPending: isGenerating } = useAutoGenerateRepurposes();
  const [generatingVideoId, setGeneratingVideoId] = useState<number | null>(null);

  const handleAutoGenerate = async (videoId: number) => {
    setGeneratingVideoId(videoId);
    try {
      await generate(videoId);
      toast.success("Repurpose checklist generated");
    } catch {
      toast.error("Failed to generate repurpose entries");
    } finally {
      setGeneratingVideoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Content Repurposing Overview
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {completionStats.completed}/{completionStats.total} items completed
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallCompletionRate} className="h-3" />
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {completionStats.completed} Published
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-yellow-600" />
              {completionStats.inProgress} In Progress
            </span>
            <span className="flex items-center gap-1">
              <Film className="h-3.5 w-3.5 text-gray-400" />
              {completionStats.planned} Planned
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Video table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Video Title</th>
                  <th className="px-4 py-3 text-left font-medium">Repurpose Progress</th>
                  <th className="px-4 py-3 text-left font-medium">Platforms</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(videos ?? []).map((video) => {
                  const videoId = Number(video.id);
                  const entry = videoRepurposeMap.get(videoId);
                  const repurposes = entry?.repurposes ?? [];
                  const completionPercent = entry?.completionPercent ?? 0;
                  const completedCount = repurposes.filter(
                    (r) => r.status === "published"
                  ).length;
                  const totalCount = repurposes.length;

                  return (
                    <tr key={video.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">
                            {video.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {totalCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={completionPercent} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completedCount}/{totalCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No items yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {repurposes.map((r) => {
                            const statusClass = STATUS_COLORS[r.status] ?? STATUS_COLORS.planned;
                            return (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className={`gap-1 text-xs ${statusClass}`}
                              >
                                {PLATFORM_ICONS[r.platform] ?? (
                                  <MessageCircle className="h-3.5 w-3.5" />
                                )}
                                {r.platform}
                              </Badge>
                            );
                          })}
                          {repurposes.length === 0 && (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {totalCount > 0 ? (
                          <Badge variant={completionPercent === 100 ? "default" : "secondary"}>
                            {completionPercent === 100
                              ? "Complete"
                              : completionPercent > 0
                              ? "In Progress"
                              : "Planned"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Started</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={isGenerating && generatingVideoId === videoId}
                          onClick={() => handleAutoGenerate(videoId)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Auto-Generate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(!videos || videos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No videos in the pipeline yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
