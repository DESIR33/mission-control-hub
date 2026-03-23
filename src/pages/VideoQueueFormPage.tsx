import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarIcon, DollarSign, ExternalLink, Film, Handshake, Plus, RefreshCw, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateVideo,
  useUpdateVideo,
  useVideoQueueItem,
  type VideoQueueItem,
} from "@/hooks/use-video-queue";
import { useCompanies } from "@/hooks/use-companies";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { syncPipelineToDeal } from "@/hooks/use-pipeline-deal-sync";
import { useQueryClient } from "@tanstack/react-query";

const ALL_PLATFORMS = [
  "YouTube",
  "TikTok",
  "Instagram",
  "X",
  "LinkedIn",
  "Facebook",
  "Twitch",
];

const statusOptions: VideoQueueItem["status"][] = [
  "idea",
  "scripting",
  "recording",
  "editing",
  "scheduled",
  "published",
];

const priorityOptions: VideoQueueItem["priority"][] = ["low", "medium", "high"];

export default function VideoQueueFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingVideo, isLoading: loadingVideo } = useVideoQueueItem(
    id ?? null
  );
  const { data: companies = [] } = useCompanies();
  const { workspaceId, isLoading: workspaceLoading, error: workspaceError, retry: retryWorkspace } = useWorkspace();
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<VideoQueueItem["status"]>("idea");
  const [priority, setPriority] = useState<VideoQueueItem["priority"]>("medium");
  const [targetPublishDate, setTargetPublishDate] = useState<Date | undefined>(
    undefined
  );
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isSponsored, setIsSponsored] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [sponsoringCompanyId, setSponsoringCompanyId] = useState<string>("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [productionCost, setProductionCost] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (existingVideo && isEditing) {
      setTitle(existingVideo.title);
      setDescription(existingVideo.description ?? "");
      setStatus(existingVideo.status);
      setPriority(existingVideo.priority);
      setTargetPublishDate(
        existingVideo.targetPublishDate
          ? parseISO(existingVideo.targetPublishDate)
          : undefined
      );
      setPlatforms(existingVideo.platforms);
      setIsSponsored(existingVideo.isSponsored);
      setCompanyId(existingVideo.company?.id ?? "");
      setSponsoringCompanyId(existingVideo.sponsoringCompany?.id ?? "");
      setProductionCost(existingVideo.productionCost != null ? String(existingVideo.productionCost) : "");
    }
  }, [existingVideo, isEditing]);

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklistItems((prev) => [...prev, newChecklistItem.trim()]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getCompanyById = (cId: string) =>
    companies.find((c) => c.id === cId) ?? null;

  const linkedDealId = existingVideo?.metadata?.dealId as string | null ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required.",
        variant: "destructive",
      });
      return;
    }

    const dateStr = targetPublishDate
      ? targetPublishDate.toISOString()
      : null;
    const company = companyId ? getCompanyById(companyId) : null;
    const sponsor = sponsoringCompanyId
      ? getCompanyById(sponsoringCompanyId)
      : null;

    if (isEditing) {
      updateVideo.mutate(
        {
          id: id!,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          targetPublishDate: dateStr,
          platforms,
          isSponsored,
          companyId: companyId || null,
          companyName: company?.name ?? null,
          companyLogo: company?.logo_url ?? null,
          sponsoringCompanyId: sponsoringCompanyId || null,
          sponsoringCompanyName: sponsor?.name ?? null,
          sponsoringCompanyLogo: sponsor?.logo_url ?? null,
          productionCost: productionCost ? Number(productionCost) : null,
        },
        {
          onSuccess: async () => {
            // Auto-create/link sponsorship deal if marked as sponsored with a company
            if (isSponsored && sponsoringCompanyId && workspaceId) {
              setIsSyncing(true);
              try {
                await syncPipelineToDeal({
                  videoQueueId: id!,
                  workspaceId,
                  title: title.trim(),
                  companyId: sponsoringCompanyId,
                  companyName: sponsor?.name ?? "Unknown",
                  youtubeVideoId: existingVideo?.youtubeVideoId ?? null,
                  existingDealId: linkedDealId,
                });
                queryClient.invalidateQueries({ queryKey: ["deals"] });
                queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
              } catch {
                // Non-critical sync failure
              } finally {
                setIsSyncing(false);
              }
            }
            toast({ title: "Success", description: "Video updated." });
            navigate("/content");
          },
          onError: (err: Error) => {
            toast({
              title: "Error",
              description: err.message || "Failed to update video.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createVideo.mutate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          targetPublishDate: dateStr,
          platforms,
          isSponsored,
          companyId: companyId || null,
          companyName: company?.name ?? null,
          companyLogo: company?.logo_url ?? null,
          sponsoringCompanyId: sponsoringCompanyId || null,
          sponsoringCompanyName: sponsor?.name ?? null,
          sponsoringCompanyLogo: sponsor?.logo_url ?? null,
          productionCost: productionCost ? Number(productionCost) : null,
          checklists: checklistItems.map((label) => ({ label })),
        },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Video created." });
            navigate("/content");
          },
          onError: (err: Error) => {
            toast({
              title: "Error",
              description: err.message || "Failed to create video.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  if (isEditing && loadingVideo) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <button
        onClick={() => navigate("/content")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Content Pipeline
      </button>

      <div className="flex items-center gap-2">
        <Film className="h-5 w-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">
          {isEditing ? "Edit Video" : "Add Video"}
        </h1>
        {linkedDealId && (
          <Link to={`/sponsorship/${linkedDealId}/edit`}>
            <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-accent">
              <Handshake className="h-3 w-3" />
              Linked Sponsorship
              <ExternalLink className="h-3 w-3" />
            </Badge>
          </Link>
        )}
      </div>

      {workspaceError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Unable to load workspace
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {workspaceError}
            </p>
          </div>
          <button
            type="button"
            onClick={retryWorkspace}
            disabled={workspaceLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${workspaceLoading ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description or notes"
            rows={3}
          />
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Status
            </label>
            <Select value={status} onValueChange={(v) => setStatus(v as VideoQueueItem["status"])}>
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Priority
            </label>
            <Select value={priority} onValueChange={(v) => setPriority(v as VideoQueueItem["priority"])}>
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

        {/* Target Publish Date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Target Publish Date
          </label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-10 w-full rounded-xl border border-border bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 inline-flex items-center gap-2",
                  targetPublishDate ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {targetPublishDate
                  ? format(targetPublishDate, "MMM d, yyyy")
                  : "Pick a date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetPublishDate}
                onSelect={(date) => {
                  setTargetPublishDate(date);
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
              {targetPublishDate && (
                <div className="border-t border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPublishDate(undefined);
                      setDatePickerOpen(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear date
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Platforms */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  platforms.includes(platform)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* Production Cost */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Production Cost ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={productionCost}
              onChange={(e) => setProductionCost(e.target.value)}
              placeholder="0.00"
              className="pl-9"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Used for ROI calculations in the Command Center.</p>
        </div>

        {/* Sponsorship */}
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => setIsSponsored(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <span className="text-sm font-medium text-foreground">Sponsored video</span>
              {isSponsored && !linkedDealId && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  A sponsorship deal will be auto-created when you save with a sponsoring company selected.
                </p>
              )}
            </div>
          </div>

          {/* Company & Sponsoring Company */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Brand / Company
              </label>
              <Select value={companyId || "none"} onValueChange={(v) => setCompanyId(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSponsored && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Sponsoring Company
                </label>
                <Select
                  value={sponsoringCompanyId || "none"}
                  onValueChange={(v) => setSponsoringCompanyId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select sponsor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Checklist (create only) */}
        {!isEditing && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Checklist Items
            </label>
            <div className="space-y-1.5">
              {checklistItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span className="flex-1 text-sm text-foreground">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add checklist item..."
                className="h-9 flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={workspaceLoading || createVideo.isPending || updateVideo.isPending || !workspaceId || isSyncing}
          >
            {workspaceLoading
              ? "Loading workspace..."
              : workspaceError
                ? "Workspace unavailable"
                : createVideo.isPending || updateVideo.isPending || isSyncing
                  ? "Saving..."
                  : isEditing
                    ? "Update Video"
                    : "Create Video"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/content")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
