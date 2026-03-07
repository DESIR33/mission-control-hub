import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  BarChart3,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useRepurposingWorkflow,
  REPURPOSE_PLATFORMS,
  REPURPOSE_STATUSES,
  type RepurposeStatus,
} from "@/hooks/use-repurposing-workflow";
import type { VideoRepurpose } from "@/hooks/use-video-repurposes";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube_shorts: <SiYoutube className="w-4 h-4 text-red-600" />,
  tiktok: <SiTiktok className="w-4 h-4 text-foreground" />,
  ig_reels: <SiInstagram className="w-4 h-4 text-pink-600" />,
  ig_carousel: <SiInstagram className="w-4 h-4 text-pink-500" />,
  twitter_thread: <SiX className="w-4 h-4 text-foreground" />,
  linkedin_post: <SiLinkedin className="w-4 h-4 text-blue-600" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  tracked: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  planned: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  archived: "bg-red-500/15 text-red-400 border-red-500/30",
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface RepurposingWorkflowProps {
  youtubeVideoId: string | undefined;
}

export function RepurposingWorkflow({ youtubeVideoId }: RepurposingWorkflowProps) {
  const {
    repurposes,
    isLoading,
    coverageScore,
    generateSuggestions,
    updateStatus,
    updateItem,
    removeItem,
  } = useRepurposingWorkflow(youtubeVideoId);

  const [editingUrl, setEditingUrl] = useState<Record<string, string>>({});

  const handleGenerateAll = async () => {
    try {
      await generateSuggestions.mutateAsync();
      toast.success("Generated repurposing suggestions for all platforms");
    } catch (err: any) {
      toast.error("Failed to generate suggestions", { description: err.message });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error("Failed to update status", { description: err.message });
    }
  };

  const handleUrlSave = async (id: string) => {
    const url = editingUrl[id];
    if (url === undefined) return;
    try {
      await updateItem.mutateAsync({ id, url: url || null } as any);
      setEditingUrl((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("URL updated");
    } catch (err: any) {
      toast.error("Failed to update URL", { description: err.message });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeItem.mutateAsync(id);
      toast.success("Repurpose item removed");
    } catch (err: any) {
      toast.error("Failed to remove item", { description: err.message });
    }
  };

  const totalViews = repurposes.reduce((s, r) => s + (r.views ?? 0), 0);
  const publishedCount = repurposes.filter((r) => r.status === "published" || r.status === "tracked").length;

  const getPlatformLabel = (type: string) => {
    const platform = REPURPOSE_PLATFORMS.find((p) => p.id === type);
    return platform?.label ?? type.replace(/_/g, " ");
  };

  const getPlatformFormat = (type: string) => {
    const platform = REPURPOSE_PLATFORMS.find((p) => p.id === type);
    return platform?.format ?? "";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 w-full bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Content Repurposing ({repurposes.length})
          </h3>
          {repurposes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {publishedCount} published · {fmtCount(totalViews)} total views
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateAll}
          disabled={generateSuggestions.isPending}
        >
          {generateSuggestions.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1" />
          )}
          Generate Clips
        </Button>
      </div>

      {/* Repurposing Score */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Repurposing Score</span>
          </div>
          <Badge variant="outline" className={coverageScore.percentage >= 80 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : coverageScore.percentage >= 40 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-gray-500/15 text-gray-400 border-gray-500/30"}>
            {coverageScore.percentage}%
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${coverageScore.percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {coverageScore.published} of {coverageScore.total} platforms covered
        </p>
      </motion.div>

      {/* Repurpose Items Grid */}
      {repurposes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No repurposed content yet. Click "Generate Clips" to create suggestions for all platforms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {repurposes.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-lg border border-border bg-card p-3 space-y-2"
            >
              {/* Platform header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-background">
                    {PLATFORM_ICONS[item.repurpose_type] ?? (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {getPlatformLabel(item.repurpose_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getPlatformFormat(item.repurpose_type)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemove(item.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Select
                  value={item.status}
                  onValueChange={(v) => handleStatusChange(item.id, v)}
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
                    {/* Also support legacy statuses */}
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[item.status] ?? STATUS_COLORS.draft}`}>
                  {item.status.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* URL */}
              <div className="flex items-center gap-1">
                {editingUrl[item.id] !== undefined ? (
                  <>
                    <Input
                      value={editingUrl[item.id]}
                      onChange={(e) => setEditingUrl((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="https://..."
                      className="h-7 text-xs flex-1"
                    />
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUrlSave(item.id)}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5 text-xs"
                      >
                        <ExternalLink className="w-3 h-3" /> Link
                      </a>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingUrl((prev) => ({ ...prev, [item.id]: item.url ?? "" }))}
                      >
                        + Add link
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Views */}
              {(item.views ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground font-mono">{fmtCount(item.views)} views</p>
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-xs text-muted-foreground truncate" title={item.notes}>
                  {item.notes}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
