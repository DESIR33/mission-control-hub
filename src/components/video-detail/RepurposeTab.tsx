import { useState } from "react";
import {
  Youtube,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  useRepurposes,
  useCreateRepurpose,
  useUpdateRepurpose,
  type ContentRepurpose,
} from "@/hooks/use-repurposes";
import { useAutoGenerateRepurposes } from "@/hooks/use-repurposing-workflow";
import { toast } from "sonner";
import { safeFormat } from "@/lib/date-utils";

interface RepurposeTabProps {
  sourceVideoId: number | string;
  videoTitle: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  YouTube: <Youtube className="h-4 w-4" />,
  "Twitter/X": <Twitter className="h-4 w-4" />,
  LinkedIn: <Linkedin className="h-4 w-4" />,
  Newsletter: <Mail className="h-4 w-4" />,
};

const STATUS_OPTIONS = ["planned", "in_progress", "published"] as const;

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500/15 text-green-700 border-green-300",
  in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  planned: "bg-gray-500/15 text-gray-500 border-gray-300",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  published: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-yellow-600" />,
  planned: <Pencil className="h-3.5 w-3.5 text-gray-400" />,
};

export default function RepurposeTab({
  sourceVideoId,
  videoTitle,
}: RepurposeTabProps) {
  const { data: repurposes, isLoading } = useRepurposes(sourceVideoId);
  const updateRepurpose = useUpdateRepurpose();
  const { generate, isPending: isGenerating } = useAutoGenerateRepurposes();

  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");

  const items = repurposes ?? [];
  const completedCount = items.filter((r) => r.status === "published").length;
  const totalCount = items.length;

  const handleAutoGenerate = async () => {
    try {
      await generate(sourceVideoId);
      toast.success("Repurpose checklist generated");
    } catch {
      toast.error("Failed to generate repurpose entries");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: Parameters<typeof updateRepurpose.mutateAsync>[0] = {
        id,
        status: newStatus,
      };
      if (newStatus === "published") {
        updates.published_at = new Date().toISOString();
      }
      await updateRepurpose.mutateAsync(updates);
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleUrlSave = async (id: string) => {
    try {
      await updateRepurpose.mutateAsync({
        id,
        published_url: urlValue || undefined,
      });
      setEditingUrlId(null);
      setUrlValue("");
      toast.success("URL updated");
    } catch {
      toast.error("Failed to update URL");
    }
  };

  const startEditUrl = (item: ContentRepurpose) => {
    setEditingUrlId(item.id);
    setUrlValue(item.published_url ?? "");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-40 w-full bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Repurposing Checklist
          </h3>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount}/{totalCount} items published
            </p>
          )}
        </div>
        {totalCount === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Auto-Generate Checklist
          </Button>
        )}
        {totalCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Missing
          </Button>
        )}
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No repurpose items yet. Click &quot;Auto-Generate Checklist&quot; to
            create entries for all default platforms.
          </p>
        </div>
      )}

      {/* Repurpose items */}
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Platform icon */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background shrink-0 mt-0.5">
                {PLATFORM_ICONS[item.platform] ?? (
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.platform} &middot; {item.format}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`gap-1 text-xs ${STATUS_COLORS[item.status] ?? STATUS_COLORS.planned}`}
                  >
                    {STATUS_ICONS[item.status] ?? STATUS_ICONS.planned}
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>

                {/* Status dropdown and URL */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={item.status}
                    onValueChange={(v) => handleStatusChange(item.id, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Published URL */}
                  {editingUrlId === item.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                      <Input
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://..."
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleUrlSave(item.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingUrlId(null);
                          setUrlValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {item.published_url ? (
                        <a
                          href={item.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => startEditUrl(item)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        {item.published_url ? "Edit URL" : "Add URL"}
                      </Button>
                    </div>
                  )}

                  {/* Published date */}
                  {item.published_at && (
                    <span className="text-xs text-muted-foreground">
                      Published{" "}
                      {safeFormat(item.published_at, "P")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
