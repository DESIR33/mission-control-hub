import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  DollarSign,
  Film,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SiFacebook,
  SiInstagram,
  SiLinkedin,
  SiTiktok,
  SiTwitch,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateVideo,
  useToggleChecklist,
  useAddChecklist,
  useDeleteChecklist,
  type VideoQueueItem,
} from "@/hooks/use-video-queue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusOptions: VideoQueueItem["status"][] = [
  "idea",
  "scripting",
  "recording",
  "editing",
  "scheduled",
  "published",
];

const priorityOptions: VideoQueueItem["priority"][] = ["low", "medium", "high"];

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
      return <SiYoutube className="h-4 w-4 text-red-600" />;
    case "tiktok":
      return <SiTiktok className="h-4 w-4 text-foreground" />;
    case "instagram":
      return <SiInstagram className="h-4 w-4 text-pink-600" />;
    case "x":
      return <SiX className="h-4 w-4 text-foreground" />;
    case "linkedin":
      return <SiLinkedin className="h-4 w-4 text-blue-600" />;
    case "facebook":
      return <SiFacebook className="h-4 w-4 text-blue-700" />;
    case "twitch":
      return <SiTwitch className="h-4 w-4 text-purple-600" />;
    default:
      return <Film className="h-4 w-4 text-muted-foreground" />;
  }
};

interface VideoQueueDetailsProps {
  video: VideoQueueItem;
  onClose: () => void;
  onUpdate: () => void;
}

export function VideoQueueDetails({
  video,
  onClose,
  onUpdate,
}: VideoQueueDetailsProps) {
  const { toast } = useToast();
  const updateVideo = useUpdateVideo();
  const toggleChecklist = useToggleChecklist();
  const addChecklist = useAddChecklist();
  const deleteChecklist = useDeleteChecklist();
  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  // Fetch linked deals for revenue attribution
  const { data: linkedDeals = [] } = useQuery({
    queryKey: ["video-deals", video.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, value, stage, currency")
        .eq("video_queue_id", video.id)
        .is("deleted_at", null);
      return data ?? [];
    },
  });

  const totalRevenue = linkedDeals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  const completedCount = video.checklists.filter((c) => c.completed).length;
  const totalCount = video.checklists.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleStatusChange = (status: string) => {
    updateVideo.mutate(
      { id: video.id, status: status as VideoQueueItem["status"] },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: "Status updated." });
          onUpdate();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update status.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handlePriorityChange = (priority: string) => {
    updateVideo.mutate(
      { id: video.id, priority: priority as VideoQueueItem["priority"] },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: "Priority updated." });
          onUpdate();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update priority.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleToggleChecklist = (checklistId: number, completed: boolean) => {
    toggleChecklist.mutate(
      { videoId: video.id, checklistId, completed: !completed },
      {
        onSuccess: () => onUpdate(),
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update checklist.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleAddChecklist = () => {
    if (!newChecklistLabel.trim()) return;
    addChecklist.mutate(
      { videoId: video.id, label: newChecklistLabel.trim() },
      {
        onSuccess: () => {
          setNewChecklistLabel("");
          onUpdate();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to add checklist item.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDeleteChecklist = (checklistId: number) => {
    deleteChecklist.mutate(
      { videoId: video.id, checklistId },
      {
        onSuccess: () => onUpdate(),
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete checklist item.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {video.description || "No description added yet."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Status & Priority selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select value={video.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="capitalize">{s}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Priority
          </label>
          <Select value={video.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="capitalize">{p}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {video.targetPublishDate && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Target Publish Date
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {format(new Date(video.targetPublishDate), "MMM d, yyyy")}
            </p>
          </div>
        )}
        {video.isSponsored && video.sponsoringCompany && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-3.5 w-3.5" />
              Sponsor
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {video.sponsoringCompany.name}
            </p>
          </div>
        )}
        {video.company && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-3.5 w-3.5" />
              Brand
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {video.company.name}
            </p>
          </div>
        )}
      </div>

      {/* Revenue Attribution */}
      {linkedDeals.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Revenue
          </label>
          <div className="space-y-1.5">
            {linkedDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-foreground truncate">{deal.title}</span>
                <span className={`text-xs font-mono font-medium ${deal.stage === "closed_won" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {deal.value != null
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value)
                    : "$0"}
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] capitalize ${deal.stage === "closed_won" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {deal.stage.replace("_", " ")}
                </span>
              </div>
            ))}
            {totalRevenue > 0 && (
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">Total Earned</span>
                <span className="text-sm font-mono font-bold text-emerald-600">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platforms */}
      {video.platforms.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {video.platforms.map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
              >
                {getPlatformIcon(platform)}
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusTone[video.status]}`}
        >
          {video.status}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${priorityTone[video.priority]}`}
        >
          {video.priority}
        </span>
        {video.isSponsored && (
          <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            Sponsored
          </span>
        )}
      </div>

      {/* Checklist */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Checklist ({completedCount}/{totalCount})
          </label>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          )}
        </div>

        {totalCount > 0 && (
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="space-y-1.5">
          {video.checklists.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <button
                onClick={() => handleToggleChecklist(item.id, item.completed)}
                className="shrink-0"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {item.label}
              </span>
              <button
                onClick={() => handleDeleteChecklist(item.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newChecklistLabel}
            onChange={(e) => setNewChecklistLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChecklist();
            }}
            placeholder="Add checklist item..."
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleAddChecklist}
            disabled={!newChecklistLabel.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
