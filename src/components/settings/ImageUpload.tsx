import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  shape?: "circle" | "rounded";
  size?: "sm" | "lg";
  fallback?: React.ReactNode;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label = "Image",
  shape = "circle",
  size = "lg",
  fallback,
  disabled,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const sizeClasses = size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const shapeClasses = shape === "circle" ? "rounded-full" : "rounded-lg";

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 2 * 1024 * 1024) return; // 2 MB limit
      setUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
      } catch {
        // Error handled by caller via toast
      } finally {
        setUploading(false);
      }
    },
    [onUpload, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}

      <div className="flex items-center gap-4">
        {/* Preview / drop zone */}
        <button
          type="button"
          disabled={disabled || uploading}
          className={cn(
            "relative flex items-center justify-center border-2 border-dashed border-border bg-muted/50 transition-colors overflow-hidden group",
            shapeClasses,
            sizeClasses,
            dragOver && "border-primary bg-primary/10",
            !disabled && !uploading && "cursor-pointer hover:border-primary/60",
            disabled && "opacity-60 cursor-not-allowed",
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : value ? (
            <>
              <img
                src={value}
                alt="Preview"
                className={cn("h-full w-full object-cover", shapeClasses)}
              />
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
                  shapeClasses,
                )}
              >
                <Upload className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {fallback || <ImageIcon className="w-6 h-6 text-muted-foreground" />}
            </div>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
          disabled={disabled || uploading}
        />

        {/* Actions */}
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Remove
            </Button>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-left"
            onClick={() => setShowUrlInput((v) => !v)}
          >
            {showUrlInput ? "Hide URL input" : "Paste URL instead"}
          </button>
        </div>
      </div>

      {/* URL fallback input */}
      {showUrlInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.png"
          disabled={disabled || uploading}
          className="text-sm"
        />
      )}
    </div>
  );
}
