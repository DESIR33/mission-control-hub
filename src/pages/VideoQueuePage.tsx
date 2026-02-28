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
  SiLinkedin,
  SiTiktok,
  SiTwitch,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

const statusTone: Record<VideoQueueItem["status"], string> = {
  idea: "bg-slate-100 text-slate-700 border-slate-200",
  scripting: "bg-blue-100 text-blue-700 border-blue-200",
  recording: "bg-amber-100 text-amber-700 border-amber-200",
  editing: "bg-orange-100 text-orange-700 border-orange-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const priorityTone: Record<VideoQueueItem["priority"], string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
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
  const [currentView, setCurrentView] = useState<"list" | "cards" | "calendar">("list");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: videos = [], isLoading } = useVideoQueue();
  const deleteVideoMutation = useDeleteVideo();

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
    if (
      confirm(
        "Are you sure you want to delete this video? This action cannot be undone."
      )
    ) {
      deleteVideoMutation.mutate(videoId, {
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
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col pb-20 sm:pb-0">
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-foreground" />
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Video Queue
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage ideas, production, and publishing in one workflow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.04)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <Link to="/content/create">
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.04)]">
                <Plus className="h-3.5 w-3.5" />
                Add video
              </button>
            </Link>
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
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search videos"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.04)] focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <button
              className={cn(
                "rounded-lg p-2",
                currentView === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("list")}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                "rounded-lg p-2",
                currentView === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("cards")}
              title="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                "rounded-lg p-2",
                currentView === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("calendar")}
              title="Calendar view"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-muted/10 p-4">
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
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityTone[video.priority]}`}
                        >
                          {video.priority}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone[video.status]}`}
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
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-primary"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link to={`/content/${video.id}/edit`}>
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone[video.status]}`}
                    >
                      {video.status}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityTone[video.priority]}`}
                    >
                      {video.priority}
                    </span>
                    {video.isSponsored && (
                      <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
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

                  <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-primary"
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <Link to={`/content/${video.id}/edit`}>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
    </div>
  );
}
