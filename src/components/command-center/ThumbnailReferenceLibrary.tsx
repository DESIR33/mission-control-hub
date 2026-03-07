import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useThumbnailReferences,
  useUploadThumbnailReference,
  useDeleteThumbnailReference,
} from "@/hooks/use-thumbnail-references";
import {
  Upload, Trash2, Plus, X, ImagePlus, ExternalLink, Tag, Loader2,
} from "lucide-react";

export function ThumbnailReferenceLibrary() {
  const { data: references = [], isLoading } = useThumbnailReferences();
  const upload = useUploadThumbnailReference();
  const deleteRef = useDeleteThumbnailReference();

  const [showUpload, setShowUpload] = useState(false);
  const [label, setLabel] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sourceChannel, setSourceChannel] = useState("");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filterTag, setFilterTag] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const allTags = Array.from(new Set(references.flatMap((r) => r.tags || [])));

  const filtered = filterTag === "all"
    ? references
    : references.filter((r) => r.tags?.includes(filterTag));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      await upload.mutateAsync({
        file,
        label: label || undefined,
        tags,
        source_channel: sourceChannel || undefined,
        source_video_url: sourceVideoUrl || undefined,
        notes: notes || undefined,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setShowUpload(false);
    setLabel("");
    setTags([]);
    setTagInput("");
    setSourceChannel("");
    setSourceVideoUrl("");
    setNotes("");
    setSelectedFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Reference Library</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload thumbnails you admire to use as training references for AI generation
          </p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)} variant={showUpload ? "secondary" : "default"}>
          {showUpload ? <X className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
          {showUpload ? "Cancel" : "Upload References"}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <Card className="p-4 border-primary/30 bg-primary/5 space-y-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : "Click or drag thumbnails here"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="w-24 h-14 rounded object-cover border border-border"
                  />
                  <button
                    onClick={() => setSelectedFiles(selectedFiles.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. MrBeast style"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source Channel</Label>
              <Input
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
                placeholder="e.g. MrBeast"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Source Video URL</Label>
            <Input
              value={sourceVideoUrl}
              onChange={(e) => setSourceVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter"
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addTag}>
                <Tag className="w-3 h-3" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1">
                    {t}
                    <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What do you like about this thumbnail?"
              className="text-sm min-h-[60px]"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || upload.isPending}
            className="w-full"
          >
            {upload.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload {selectedFiles.length} Reference{selectedFiles.length !== 1 ? "s" : ""}
          </Button>
        </Card>
      )}

      {/* Filter */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={filterTag === "all" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setFilterTag("all")}
          >
            All ({references.length})
          </Badge>
          {allTags.map((t) => (
            <Badge
              key={t}
              variant={filterTag === t ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilterTag(t)}
            >
              {t} ({references.filter((r) => r.tags?.includes(t)).length})
            </Badge>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading references…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No reference thumbnails yet</p>
          <p className="text-xs mt-1">Upload thumbnails you admire to train better AI generations</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((ref) => (
            <Card key={ref.id} className="overflow-hidden border-border group relative">
              <img
                src={ref.url}
                alt={ref.label || "Thumbnail reference"}
                className="w-full aspect-video object-cover"
              />
              <div className="p-2 space-y-1">
                {ref.label && (
                  <p className="text-xs font-medium text-foreground truncate">{ref.label}</p>
                )}
                {ref.source_channel && (
                  <p className="text-xs text-muted-foreground truncate">📺 {ref.source_channel}</p>
                )}
                {ref.tags && ref.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {ref.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {ref.source_video_url && (
                  <a
                    href={ref.source_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 rounded bg-background/80 flex items-center justify-center hover:bg-background"
                  >
                    <ExternalLink className="w-3 h-3 text-foreground" />
                  </a>
                )}
                <button
                  onClick={() => deleteRef.mutate(ref)}
                  className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center hover:bg-destructive"
                >
                  <Trash2 className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
