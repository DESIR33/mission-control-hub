import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Loader2, Clock } from "lucide-react";
import { useVideoSubtitles, useUploadSubtitle } from "@/hooks/use-video-subtitles";

interface SubtitleUploaderProps {
  youtubeVideoId?: string;
  videoTitle?: string;
}

export function SubtitleUploader({ youtubeVideoId, videoTitle }: SubtitleUploaderProps) {
  const { data: subtitles = [] } = useVideoSubtitles(youtubeVideoId);
  const uploadSub = useUploadSubtitle();
  const fileRef = useRef<HTMLInputElement>(null);
  const [videoId, setVideoId] = useState(youtubeVideoId || "");
  const [title, setTitle] = useState(videoTitle || "");
  const [language, setLanguage] = useState("en");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    uploadSub.mutate({
      youtube_video_id: videoId || youtubeVideoId || "",
      video_title: title || videoTitle || "",
      language,
      srt_content: text,
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const currentSubs = subtitles.filter((s) => !youtubeVideoId || s.youtube_video_id === youtubeVideoId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Subtitles / SRT Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!youtubeVideoId && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Video ID</Label><Input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="YouTube Video ID" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Video Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" className="h-8 text-xs" /></div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
          <input ref={fileRef} type="file" accept=".srt,.vtt" className="hidden" onChange={handleFileUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadSub.isPending} className="flex-1">
            {uploadSub.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
            Upload .SRT
          </Button>
        </div>

        {currentSubs.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentSubs.map((sub) => (
              <div key={sub.id} className="rounded-md border border-border p-2 space-y-1">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{sub.video_title || sub.youtube_video_id}</span>
                    <Badge variant="outline" className="text-xs">{sub.language}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{(sub.parsed_segments as any[])?.length || 0} segments</span>
                </div>
                {expandedId === sub.id && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {((sub.parsed_segments as any[]) || []).slice(0, 20).map((seg: any, i: number) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground shrink-0 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{seg.start}</span>
                        <span className="text-foreground">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
