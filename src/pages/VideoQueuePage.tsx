import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  Edit3,
  Eye,
  Film,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { ContentCalendar } from "@/components/video-queue/ContentCalendar";
import { format } from "date-fns";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiTwitch,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Linkedin as SiLinkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { VideoQueueDetails } from "@/components/video-queue/VideoQueueDetails";
import {
  useVideoQueue,
  useDeleteVideo,
  type VideoQueueItem,
} from "@/hooks/use-video-queue";
import { useVideoRevenueLookup } from "@/hooks/use-video-revenue-lookup";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";

const statusTone: Record<VideoQueueItem["status"], string> = {
  idea: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  scripting: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  recording: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  editing: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  scheduled: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const priorityTone: Record<VideoQueueItem["priority"], string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  high: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "youtube":
      return <SiYoutube className="h-3.5 w-3.5 text-red-600" />;
    case "tiktok":
      return <SiTiktok className="h-3.5 w-3.5 text-foreground" />;
    case "instagram":
      return <SiInstagram className="h-3.5 w-3.5 text-pink-600" />;
    case "x":
      return <SiX className="h-3.5 w-3.5 text-foreground" />;
    case "linkedin":
      return <SiLinkedin className="h-3.5 w-3.5 text-blue-600" />;
    case "facebook":
      return <SiFacebook className="h-3.5 w-3.5 text-blue-700" />;
    case "twitch":
      return <SiTwitch className="h-3.5 w-3.5 text-purple-600" />;
    default:
      return <Film className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const nameFromUser = (
  person?: { firstName: string | null; lastName: string | null } | null
) => {
  if (!person) return "Unassigned";
  const full = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return full || "Unassigned";
};

export default function VideoQueuePage() {
  const [selectedVideo, setSelectedVideo] = useState<VideoQueueItem | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteVideoId, setDeleteVideoId] = useState<number | string | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "cards" | "calendar">(() => {
    const saved = localStorage.getItem("video-queue-view");
    if (saved === "list" || saved === "cards" || saved === "calendar") return saved;
    return "list";
  });

  const handleViewChange = (view: "list" | "cards" | "calendar") => {
    setCurrentView(view);
    localStorage.setItem("video-queue-view", view);
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: videos = [], isLoading } = useVideoQueue();
  const deleteVideoMutation = useDeleteVideo();
  const { lookup: revenueLookup } = useVideoRevenueLookup();
  const { data: ytVideoStats = [] } = useYouTubeVideoStats(200);
  const ytStatsLookup = useMemo(() => {
    const map = new Map<string, { views: number; likes: number; comments: number; ctr: number | null }>();
    for (const yt of ytVideoStats) {
      map.set(yt.youtube_video_id, {
        views: yt.views ?? 0,
        likes: yt.likes ?? 0,
        comments: yt.comments ?? 0,
        ctr: yt.ctr_percent ?? null,
      });
    }
    return map;
  }, [ytVideoStats]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["video-queue"] });
    toast({ title: "Refreshed", description: "Video queue data updated." });
  };

  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          video.title.toLowerCase().includes(query) ||
          video.description?.toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" || video.status === statusFilter;
        const matchesPriority =
          priorityFilter === "all" || video.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [videos, searchQuery, statusFilter, priorityFilter]
  );

  const stats = useMemo(
    () => ({
      total: videos.length,
      planning: videos.filter((video) =>
        ["idea", "scripting"].includes(video.status)
      ).length,
      production: videos.filter((video) =>
        ["recording", "editing"].includes(video.status)
      ).length,
      sponsored: videos.filter((video) => video.isSponsored).length,
    }),
    [videos]
  );

  const handleDeleteVideo = (videoId: number | string) => {
    setDeleteVideoId(videoId);
  };

  const confirmDelete = () => {
    if (deleteVideoId === null) return;
    deleteVideoMutation.mutate(deleteVideoId, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Video deleted successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete video.",
          variant: "destructive",
        });
      },
    });
    setDeleteVideoId(null);
  };

  return (
    <div className="flex flex-col sm:h-[calc(100vh-64px)]">
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-foreground" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Video Queue
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage ideas, production, and publishing in one workflow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/content/create">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add video
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { label: "Total", value: stats.total },
            { label: "Planning", value: stats.planning },
            { label: "Production", value: stats.production },
            { label: "Sponsored", value: stats.sponsored },
          ].map((stat) => (
            <div
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs"
            >
              <span className="font-semibold text-foreground">
                {stat.value}
              </span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search videos"
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[165px] rounded-xl border-border bg-background text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="scripting">Scripting</SelectItem>
              <SelectItem value="recording">Recording</SelectItem>
              <SelectItem value="editing">Editing</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-10 w-[165px] rounded-xl border-border bg-background text-sm">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="List view"
              className={cn(
                "h-8 w-8",
                currentView === "list"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground"
              )}
              onClick={() => handleViewChange("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Card view"
              className={cn(
                "h-8 w-8",
                currentView === "cards"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground"
              )}
              onClick={() => handleViewChange("cards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Calendar view"
              className={cn(
                "h-8 w-8",
                currentView === "calendar"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground"
              )}
              onClick={() => handleViewChange("calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 bg-muted/10 p-4 sm:min-h-0 sm:overflow-y-auto">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-border bg-card">
            <div className="text-center">
              <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading video queue...
              </p>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ||
              statusFilter !== "all" ||
              priorityFilter !== "all"
                ? "No videos match your current filters."
                : "No videos in your queue yet."}
            </p>
          </div>
        ) : currentView === "calendar" ? (
          <ContentCalendar
            videos={filteredVideos}
            onSelectVideo={setSelectedVideo}
          />
        ) : currentView === "list" ? (
          <div className="space-y-3">
            {filteredVideos.map((video) => {
              const completedChecklistItems = video.checklists.filter(
                (item) => item.completed
              ).length;
              return (
                <div
                  key={video.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                          {video.title}
                        </h2>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${priorityTone[video.priority]}`}
                        >
                          {video.priority}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusTone[video.status]}`}
                        >
                          {video.status}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {video.description || "No description added yet."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {video.targetPublishDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(
                              new Date(video.targetPublishDate),
                              "MMM d, yyyy"
                            )}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {completedChecklistItems}/{video.checklists.length}{" "}
                          checklist
                        </span>
                        {video.sponsoringCompany?.name && (
                          <span className="inline-flex items-center gap-1">
                            <Circle className="h-3.5 w-3.5" />
                            Sponsored by {video.sponsoringCompany.name}
                          </span>
                        )}
                        {video.company?.name && (
                          <span className="inline-flex items-center gap-1">
                            <Circle className="h-3.5 w-3.5" />
                            Brand: {video.company.name}
                          </span>
                        )}
                        {video.youtubeVideoId && revenueLookup.get(video.youtubeVideoId) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            ${revenueLookup.get(video.youtubeVideoId)!.totalRevenue.toFixed(0)} rev
                          </span>
                        )}
                        {video.youtubeVideoId && ytStatsLookup.get(video.youtubeVideoId) && (() => {
                          const stats = ytStatsLookup.get(video.youtubeVideoId!)!;
                          return (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                                <Eye className="h-3 w-3" /> {stats.views.toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                                {stats.likes.toLocaleString()} likes
                              </span>
                              {stats.ctr != null && stats.ctr > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                                  CTR {stats.ctr.toFixed(1)}%
                                </span>
                              )}
                            </>
                          );
                        })()}
                        <span className="inline-flex items-center gap-1">
                          <Circle className="h-3.5 w-3.5" />
                          Owner: {nameFromUser(video.assignedTo)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="mr-2 hidden items-center gap-1 sm:flex">
                        {video.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background"
                            title={platform}
                          >
                            {getPlatformIcon(platform)}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="View details"
                        className="text-primary"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" aria-label="Edit" asChild>
                        <Link to={`/content/${video.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Delete"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteVideo(video.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => {
              const completedChecklistItems = video.checklists.filter(
                (item) => item.completed
              ).length;
              return (
                <div
                  key={video.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusTone[video.status]}`}
                    >
                      {video.status}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${priorityTone[video.priority]}`}
                    >
                      {video.priority}
                    </span>
                    {video.isSponsored && (
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                        Sponsored
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                    {video.title}
                  </h2>

                  <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">
                    {video.description || "No description added yet."}
                  </p>

                  {video.platforms.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {video.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background"
                          title={platform}
                        >
                          {getPlatformIcon(platform)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {video.targetPublishDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(video.targetPublishDate),
                          "MMM d, yyyy"
                        )}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {completedChecklistItems}/{video.checklists.length}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Owner: {nameFromUser(video.assignedTo)}
                  </p>
                  {video.youtubeVideoId && revenueLookup.get(video.youtubeVideoId) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      ${revenueLookup.get(video.youtubeVideoId)!.totalRevenue.toFixed(0)} rev
                    </span>
                  )}
                  {video.youtubeVideoId && ytStatsLookup.get(video.youtubeVideoId) && (() => {
                    const stats = ytStatsLookup.get(video.youtubeVideoId!)!;
                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                          <Eye className="h-3 w-3" /> {stats.views.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                          {stats.likes.toLocaleString()} likes
                        </span>
                        {stats.ctr != null && stats.ctr > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                            CTR {stats.ctr.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="View details"
                      className="h-8 w-8 text-primary"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Edit" className="h-8 w-8" asChild>
                      <Link to={`/content/${video.id}/edit`}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Delete"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteVideo(video.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedVideo && (
        <Dialog
          open={!!selectedVideo}
          onOpenChange={() => setSelectedVideo(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <VideoQueueDetails
              video={selectedVideo}
              onClose={() => setSelectedVideo(null)}
              onUpdate={() => {
                setSelectedVideo(null);
                queryClient.invalidateQueries({
                  queryKey: ["video-queue"],
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteVideoId !== null} onOpenChange={(open) => !open && setDeleteVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
