import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2 } from "lucide-react";
import type { VideoNote } from "@/hooks/use-video-notes";

interface Props {
  note: VideoNote | null | undefined;
  isLoading: boolean;
  onSave: (updates: {
    content_md?: string;
    post_mortem_json?: VideoNote["post_mortem_json"];
  }) => void;
  isSaving: boolean;
}

const PM_FIELDS: { key: keyof NonNullable<VideoNote["post_mortem_json"]>; label: string; multiline?: boolean }[] = [
  { key: "hook_used", label: "Hook Used" },
  { key: "target_persona", label: "Target Persona" },
  { key: "title_hypothesis", label: "Title Hypothesis" },
  { key: "thumbnail_hypothesis", label: "Thumbnail Hypothesis" },
  { key: "what_worked", label: "What Worked", multiline: true },
  { key: "what_didnt", label: "What Didn't Work", multiline: true },
  { key: "next_video_ideas", label: "Next Video Ideas", multiline: true },
];

export function NotesEditor({ note, isLoading, onSave, isSaving }: Props) {
  const [contentMd, setContentMd] = useState("");
  const [postMortem, setPostMortem] = useState<VideoNote["post_mortem_json"]>({});
  const [dirty, setDirty] = useState(false);

  // Sync from loaded note
  useEffect(() => {
    if (note) {
      setContentMd(note.content_md ?? "");
      setPostMortem(note.post_mortem_json ?? {});
      setDirty(false);
    }
  }, [note]);

  // Debounced autosave
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      onSave({ content_md: contentMd, post_mortem_json: postMortem });
      setDirty(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [contentMd, postMortem, dirty, onSave]);

  const handleContentChange = useCallback((val: string) => {
    setContentMd(val);
    setDirty(true);
  }, []);

  const handlePmChange = useCallback((key: string, val: string) => {
    setPostMortem((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        {isSaving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving…
          </>
        ) : dirty ? (
          <span>Unsaved changes</span>
        ) : note ? (
          <>
            <Check className="w-3 h-3 text-green-500" />
            Saved
          </>
        ) : (
          <span>Start typing to create notes</span>
        )}
      </div>

      {/* Main notes */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Notes (Markdown)
        </Label>
        <Textarea
          value={contentMd}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your video notes here… supports markdown"
          className="min-h-[200px] font-mono text-sm"
        />
      </div>

      {/* Post-mortem structured fields */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Post-Mortem Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PM_FIELDS.map(({ key, label, multiline }) => (
            <div key={key} className={multiline ? "md:col-span-2" : ""}>
              <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
              {multiline ? (
                <Textarea
                  value={(postMortem as any)?.[key] ?? ""}
                  onChange={(e) => handlePmChange(key, e.target.value)}
                  placeholder={label}
                  className="min-h-[80px] text-sm"
                />
              ) : (
                <Input
                  value={(postMortem as any)?.[key] ?? ""}
                  onChange={(e) => handlePmChange(key, e.target.value)}
                  placeholder={label}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
