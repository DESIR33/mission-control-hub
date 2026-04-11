import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  SiYoutube,
  SiTiktok,
  SiInstagram,
  SiX,
  SiLinkedin,
} from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeFormat } from "@/lib/date-utils";
import { REPURPOSE_PLATFORMS, REPURPOSE_STATUSES } from "@/hooks/use-repurposing-workflow";
import type { VideoRepurpose } from "@/hooks/use-video-repurposes";

interface RepurposeWithVideo extends VideoRepurpose {
  videoTitle?: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube_shorts: <SiYoutube className="w-3.5 h-3.5 text-red-600" />,
  tiktok: <SiTiktok className="w-3.5 h-3.5 text-foreground" />,
  ig_reels: <SiInstagram className="w-3.5 h-3.5 text-pink-600" />,
  ig_carousel: <SiInstagram className="w-3.5 h-3.5 text-pink-500" />,
  twitter_thread: <SiX className="w-3.5 h-3.5 text-foreground" />,
  linkedin_post: <SiLinkedin className="w-3.5 h-3.5 text-blue-600" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  planned: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  tracked: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  archived: "bg-red-500/15 text-red-400 border-red-500/30",
};

const getPlatformLabel = (type: string) => {
  const platform = REPURPOSE_PLATFORMS.find((p) => p.id === type);
  return platform?.label ?? type.replace(/_/g, " ");
};

export function RepurposingQueue() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");

  // Fetch all repurposing items across all videos
  const { data: allRepurposes = [], isLoading } = useQuery({
    queryKey: ["repurposing-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_repurposes" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch video titles for context
      const videoIds = [...new Set((data ?? []).map((r: any) => r.youtube_video_id))];
      let videoTitles = new Map<string, string>();

      if (videoIds.length > 0) {
        const { data: videos } = await supabase
          .from("youtube_video_stats")
          .select("youtube_video_id, title")
          .in("youtube_video_id", videoIds);
        if (videos) {
          for (const v of videos) {
            videoTitles.set(v.youtube_video_id, v.title);
          }
        }
      }

      return (data ?? []).map((r: any): RepurposeWithVideo => ({
        ...r,
        videoTitle: videoTitles.get(r.youtube_video_id) ?? r.youtube_video_id,
      }));
    },
    enabled: !!workspaceId,
  });

  // Filter
  const filtered = useMemo(() => {
    return allRepurposes.filter((r) => {
      if (platformFilter !== "all" && r.repurpose_type !== platformFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [allRepurposes, platformFilter, statusFilter]);

  const pendingCount = allRepurposes.filter(
    (r) => r.status !== "published" && r.status !== "tracked" && r.status !== "archived"
  ).length;

  // Bulk update
  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("video_repurposes" as any)
        .update(updates as any)
        .in("id", ids)
        .eq("workspace_id", workspaceId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurposing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["repurposing-workflow"] });
      setSelectedIds(new Set());
      setBulkStatus("");
      toast.success("Status updated for selected items");
    },
    onError: (err: any) => {
      toast.error("Failed to update", { description: err.message });
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkUpdate = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    bulkUpdate.mutate({ ids: [...selectedIds], status: bulkStatus });
  };

  // Single item status update
  const updateSingle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("video_repurposes" as any)
        .update(updates as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurposing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["repurposing-workflow"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Repurposing Queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingCount} pending across all videos · {allRepurposes.length} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {REPURPOSE_PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
            {/* Legacy types */}
            <SelectItem value="short">Short</SelectItem>
            <SelectItem value="clip">Clip</SelectItem>
            <SelectItem value="tweet">Tweet</SelectItem>
            <SelectItem value="thread">Thread</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REPURPOSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {REPURPOSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || bulkUpdate.isPending}
            >
              {bulkUpdate.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {allRepurposes.length === 0
              ? "No repurposing items yet. Generate clips from a video detail page."
              : "No items match your current filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2.5 w-8">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Video</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Platform</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Format</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Published</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-t border-border/50 hover:bg-muted/20"
                >
                  <td className="p-2.5">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => handleToggleSelect(item.id)}
                      aria-label={`Select ${item.repurpose_type}`}
                    />
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-foreground line-clamp-1 max-w-[200px]" title={(item as RepurposeWithVideo).videoTitle}>
                      {(item as RepurposeWithVideo).videoTitle ?? item.youtube_video_id}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      {PLATFORM_ICONS[item.repurpose_type] ?? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs">{getPlatformLabel(item.repurpose_type)}</span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span className="text-xs text-muted-foreground">{item.notes || "--"}</span>
                  </td>
                  <td className="p-2.5">
                    <Select
                      value={item.status}
                      onValueChange={(v) => updateSingle.mutate({ id: item.id, status: v })}
                    >
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPURPOSE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2.5 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {item.published_at
                        ? safeFormat(item.published_at, "P")
                        : "--"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
