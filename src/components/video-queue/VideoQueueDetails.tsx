import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  DollarSign,
  Film,
  Plus,
  Trash2,
  X,
  Upload,
  FileText,
  BarChart3,
  Share2,
  FlaskConical,
  PenLine,
  Link2,
  Eye,
  ThumbsUp,
  MessageSquare,
  AlertTriangle,
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
import { useVideoTranscript, useUploadTranscript, useRetentionData, useSaveRetentionData } from "@/hooks/use-video-transcripts";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useRepurposes, useCreateRepurpose, useUpdateRepurpose, useDeleteRepurpose } from "@/hooks/use-repurposes";
import { useAbTests, useCreateAbTest } from "@/hooks/use-ab-tests";
import { parseSRT, parseRetentionCSV } from "@/lib/srt-parser";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

type Tab = "overview" | "script" | "retention" | "repurpose" | "ab-tests" | "youtube";

const statusOptions: VideoQueueItem["status"][] = [
  "idea", "scripting", "recording", "editing", "scheduled", "published",
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
    case "youtube": return <SiYoutube className="h-4 w-4 text-red-600" />;
    case "tiktok": return <SiTiktok className="h-4 w-4 text-foreground" />;
    case "instagram": return <SiInstagram className="h-4 w-4 text-pink-600" />;
    case "x": return <SiX className="h-4 w-4 text-foreground" />;
    case "linkedin": return <SiLinkedin className="h-4 w-4 text-blue-600" />;
    case "facebook": return <SiFacebook className="h-4 w-4 text-blue-700" />;
    case "twitch": return <SiTwitch className="h-4 w-4 text-purple-600" />;
    default: return <Film className="h-4 w-4 text-muted-foreground" />;
  }
};

interface VideoQueueDetailsProps {
  video: VideoQueueItem;
  onClose: () => void;
  onUpdate: () => void;
}

export function VideoQueueDetails({ video, onClose, onUpdate }: VideoQueueDetailsProps) {
  const { toast } = useToast();
  const updateVideo = useUpdateVideo();
  const toggleChecklist = useToggleChecklist();
  const addChecklist = useAddChecklist();
  const deleteChecklist = useDeleteChecklist();
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Feature 1: SRT & Retention
  const { data: transcript } = useVideoTranscript(video.id);
  const uploadTranscript = useUploadTranscript();
  const { data: retentionData } = useRetentionData(video.id);
  const saveRetention = useSaveRetentionData();
  const [retentionCsv, setRetentionCsv] = useState("");
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);

  // Feature 2: YouTube linking
  const { data: ytVideos = [] } = useYouTubeVideoStats(100);
  const youtubeVideoId = video.youtubeVideoId ?? null;
  const linkedYtVideo = ytVideos.find((v) => v.youtube_video_id === youtubeVideoId);

  // Feature 7: Repurposing
  const { data: repurposes = [] } = useRepurposes(video.id);
  const createRepurpose = useCreateRepurpose();
  const updateRepurpose = useUpdateRepurpose();
  const deleteRepurpose = useDeleteRepurpose();
  const [newRepurpose, setNewRepurpose] = useState({ platform: "TikTok", format: "clip", title: "" });

  // Feature 11: A/B tests
  const { data: abTests = [] } = useAbTests(video.id);
  const createAbTest = useCreateAbTest();
  const [newAbTest, setNewAbTest] = useState({
    testType: "title" as "title" | "thumbnail",
    variantA: "", variantB: "",
    variantACtr: "", variantBCtr: "",
    winner: "" as "" | "a" | "b" | "inconclusive",
  });

  // YouTube linking prompt when status changes to published
  const [showYouTubeLinkPrompt, setShowYouTubeLinkPrompt] = useState(false);

  // Feature 13: Script
  const [scriptContent, setScriptContent] = useState(video.scriptContent ?? "");
  const scriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScriptContent(video.scriptContent ?? "");
  }, [video]);

  const handleScriptChange = useCallback((value: string) => {
    setScriptContent(value);
    if (scriptTimer.current) clearTimeout(scriptTimer.current);
    scriptTimer.current = setTimeout(() => {
      updateVideo.mutate({ id: video.id, scriptContent: value }, { onSuccess: () => onUpdate() });
    }, 800);
  }, [video.id, updateVideo, onUpdate]);

  // Linked deals
  const { data: linkedDeals = [] } = useQuery({
    queryKey: ["video-deals", video.id],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title, value, stage, currency").is("deleted_at", null) as any;
      return data ?? [];
    },
  });

  const totalRevenue = linkedDeals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (d.value ?? 0), 0);
  const completedCount = video.checklists.filter((c) => c.completed).length;
  const totalCount = video.checklists.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Retention chart data with drop-off detection
  const retentionChartData = useMemo(() => {
    if (!retentionData?.retention_points) return [];
    const pts = retentionData.retention_points as Array<{ elapsed_seconds: number; retention_percent: number }>;
    return pts.map((p, i) => {
      const drop = i > 0 ? pts[i - 1].retention_percent - p.retention_percent : 0;
      return { ...p, drop, isDropoff: drop > 5 };
    });
  }, [retentionData]);

  // Map hovered second to transcript segment
  const hoveredSegment = useMemo(() => {
    if (hoveredSecond == null || !transcript?.parsed_segments) return null;
    return transcript.parsed_segments.find((s) => hoveredSecond >= s.startSeconds && hoveredSecond <= s.endSeconds) ?? null;
  }, [hoveredSecond, transcript]);

  const wordCount = scriptContent.split(/\s+/).filter(Boolean).length;

  const handleStatusChange = (status: string) => {
    updateVideo.mutate({ id: video.id, status: status as VideoQueueItem["status"] }, {
      onSuccess: () => {
        toast({ title: "Updated", description: "Status updated." });
        // Prompt to link YouTube video when status changes to published
        if (status === "published" && !youtubeVideoId) {
          setShowYouTubeLinkPrompt(true);
        } else {
          onUpdate();
        }
      },
      onError: () => { toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }); },
    });
  };
  const handlePriorityChange = (priority: string) => {
    updateVideo.mutate({ id: video.id, priority: priority as VideoQueueItem["priority"] }, {
      onSuccess: () => { toast({ title: "Updated", description: "Priority updated." }); onUpdate(); },
      onError: () => { toast({ title: "Error", description: "Failed to update priority.", variant: "destructive" }); },
    });
  };
  const handleToggleChecklist = (checklistId: number, completed: boolean) => {
    toggleChecklist.mutate({ videoId: video.id, checklistId, completed: !completed }, {
      onSuccess: () => onUpdate(),
      onError: () => { toast({ title: "Error", description: "Failed to update checklist.", variant: "destructive" }); },
    });
  };
  const handleAddChecklist = () => {
    if (!newChecklistLabel.trim()) return;
    addChecklist.mutate({ videoId: video.id, label: newChecklistLabel.trim() }, {
      onSuccess: () => { setNewChecklistLabel(""); onUpdate(); },
      onError: () => { toast({ title: "Error", description: "Failed to add checklist item.", variant: "destructive" }); },
    });
  };
  const handleDeleteChecklist = (checklistId: number) => {
    deleteChecklist.mutate({ videoId: video.id, checklistId }, {
      onSuccess: () => onUpdate(),
      onError: () => { toast({ title: "Error", description: "Failed to delete checklist item.", variant: "destructive" }); },
    });
  };

  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      const segments = parseSRT(raw);
      uploadTranscript.mutate({ videoQueueId: video.id, srtRaw: raw, parsedSegments: segments, youtubeVideoId: youtubeVideoId }, {
        onSuccess: () => toast({ title: "Uploaded", description: `Parsed ${segments.length} segments.` }),
        onError: () => toast({ title: "Error", description: "Failed to upload transcript.", variant: "destructive" }),
      });
    };
    reader.readAsText(file);
  };

  const handleRetentionPaste = () => {
    const points = parseRetentionCSV(retentionCsv);
    if (points.length === 0) { toast({ title: "Error", description: "No valid data found. Use format: seconds,percent", variant: "destructive" }); return; }
    saveRetention.mutate({ videoQueueId: video.id, retentionPoints: points, youtubeVideoId: youtubeVideoId }, {
      onSuccess: () => { toast({ title: "Saved", description: `${points.length} retention points saved.` }); setRetentionCsv(""); },
      onError: () => toast({ title: "Error", description: "Failed to save retention data.", variant: "destructive" }),
    });
  };

  const handleLinkYouTube = (ytVideoId: string) => {
    updateVideo.mutate({ id: video.id, youtubeVideoId: ytVideoId }, {
      onSuccess: () => { toast({ title: "Linked", description: "YouTube video linked." }); onUpdate(); },
      onError: () => toast({ title: "Error", description: "Failed to link.", variant: "destructive" }),
    });
  };

  const handleAddRepurpose = () => {
    if (!newRepurpose.title.trim()) return;
    createRepurpose.mutate({ sourceVideoId: video.id, ...newRepurpose }, {
      onSuccess: () => { setNewRepurpose({ platform: "TikTok", format: "clip", title: "" }); toast({ title: "Added", description: "Repurpose added." }); },
      onError: () => toast({ title: "Error", description: "Failed to add repurpose.", variant: "destructive" }),
    });
  };

  const handleAddAbTest = () => {
    if (!newAbTest.variantA.trim() || !newAbTest.variantB.trim()) return;
    createAbTest.mutate({
      videoQueueId: video.id,
      testType: newAbTest.testType,
      variantA: newAbTest.variantA,
      variantB: newAbTest.variantB,
      variantACtr: newAbTest.variantACtr ? parseFloat(newAbTest.variantACtr) : undefined,
      variantBCtr: newAbTest.variantBCtr ? parseFloat(newAbTest.variantBCtr) : undefined,
      winner: newAbTest.winner || undefined,
      startedAt: new Date().toISOString(),
    }, {
      onSuccess: () => { setNewAbTest({ testType: "title", variantA: "", variantB: "", variantACtr: "", variantBCtr: "", winner: "" }); toast({ title: "Added", description: "A/B test logged." }); },
      onError: () => toast({ title: "Error", description: "Failed to add A/B test.", variant: "destructive" }),
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Film className="h-3.5 w-3.5" /> },
    { id: "script", label: "Script", icon: <PenLine className="h-3.5 w-3.5" /> },
    { id: "retention", label: "Retention", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "repurpose", label: "Repurpose", icon: <Share2 className="h-3.5 w-3.5" /> },
    { id: "ab-tests", label: "A/B Tests", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { id: "youtube", label: "YouTube", icon: <Link2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{video.description || "No description added yet."}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium rounded-t-md transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <Select value={video.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((s) => (<SelectItem key={s} value={s}><span className="capitalize">{s}</span></SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={video.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{priorityOptions.map((p) => (<SelectItem key={p} value={p}><span className="capitalize">{p}</span></SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {video.targetPublishDate && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Target Publish Date</div>
                <p className="mt-1 text-sm font-medium text-foreground">{format(new Date(video.targetPublishDate), "MMM d, yyyy")}</p>
              </div>
            )}
            {video.isSponsored && video.sponsoringCompany && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Circle className="h-3.5 w-3.5" />Sponsor</div>
                <p className="mt-1 text-sm font-medium text-foreground">{video.sponsoringCompany.name}</p>
              </div>
            )}
            {video.company && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Circle className="h-3.5 w-3.5" />Brand</div>
                <p className="mt-1 text-sm font-medium text-foreground">{video.company.name}</p>
              </div>
            )}
          </div>

          {/* YouTube performance badge */}
          {linkedYtVideo && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">YouTube Performance</p>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-sm"><Eye className="h-3.5 w-3.5 text-blue-500" /><span className="font-mono">{(linkedYtVideo.views ?? 0).toLocaleString()}</span></span>
                <span className="flex items-center gap-1 text-sm"><ThumbsUp className="h-3.5 w-3.5 text-green-500" /><span className="font-mono">{(linkedYtVideo.likes ?? 0).toLocaleString()}</span></span>
                <span className="flex items-center gap-1 text-sm"><MessageSquare className="h-3.5 w-3.5 text-orange-500" /><span className="font-mono">{(linkedYtVideo.comments ?? 0).toLocaleString()}</span></span>
                {linkedYtVideo.ctr_percent != null && <span className="text-sm font-mono">CTR: {linkedYtVideo.ctr_percent.toFixed(1)}%</span>}
              </div>
            </div>
          )}

          {/* Revenue */}
          {linkedDeals.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Revenue</label>
              <div className="space-y-1.5">
                {linkedDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-foreground truncate">{deal.title}</span>
                    <span className={`text-xs font-mono font-medium ${deal.stage === "closed_won" ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {deal.value != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value) : "$0"}
                    </span>
                  </div>
                ))}
                {totalRevenue > 0 && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground">Total Earned</span>
                    <span className="text-sm font-mono font-bold text-emerald-600">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Platforms */}
          {video.platforms.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {video.platforms.map((platform) => (
                  <span key={platform} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                    {getPlatformIcon(platform)}{platform}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusTone[video.status]}`}>{video.status}</span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${priorityTone[video.priority]}`}>{video.priority}</span>
            {video.isSponsored && <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Sponsored</span>}
          </div>

          {/* Checklist */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Checklist ({completedCount}/{totalCount})</label>
              {totalCount > 0 && <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>}
            </div>
            {totalCount > 0 && (
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
            <div className="space-y-1.5">
              {video.checklists.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <button onClick={() => handleToggleChecklist(item.id, item.completed)} className="shrink-0">
                    {item.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <span className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                  <button onClick={() => handleDeleteChecklist(item.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input type="text" value={newChecklistLabel} onChange={(e) => setNewChecklistLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklist(); }} placeholder="Add checklist item..." className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <button onClick={handleAddChecklist} disabled={!newChecklistLabel.trim()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Script */}
      {activeTab === "script" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{wordCount} words</p>
          </div>
          <textarea
            value={scriptContent}
            onChange={(e) => handleScriptChange(e.target.value)}
            placeholder={"## Hook\n\n## Intro\n\n## Main Content\n\n## CTA\n\n## Outro"}
            className="w-full min-h-[400px] rounded-lg border border-border bg-background p-4 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <p className="text-[10px] text-muted-foreground">Auto-saves as you type. Use ## headings to structure your script.</p>
        </div>
      )}

      {/* TAB: Retention */}
      {activeTab === "retention" && (
        <div className="space-y-4">
          {/* SRT Upload */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Transcript (SRT)</h3>
            </div>
            {transcript ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {transcript.parsed_segments.map((seg) => (
                  <div
                    key={seg.index}
                    className={`flex gap-2 text-xs p-1.5 rounded transition-colors ${
                      hoveredSegment?.index === seg.index ? "bg-primary/10 ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <span className="font-mono text-muted-foreground shrink-0 w-16">
                      {Math.floor(seg.startSeconds / 60)}:{String(Math.floor(seg.startSeconds % 60)).padStart(2, "0")}
                    </span>
                    <span className="text-foreground">{seg.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Drop or click to upload .srt file</span>
                <input type="file" accept=".srt" onChange={handleSrtUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Retention Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Retention Curve</h3>
            </div>
            {retentionChartData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={retentionChartData}
                    onMouseMove={(e: any) => {
                      if (e?.activePayload?.[0]) setHoveredSecond(e.activePayload[0].payload.elapsed_seconds);
                    }}
                    onMouseLeave={() => setHoveredSecond(null)}
                  >
                    <defs>
                      <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="elapsed_seconds" tick={{ fontSize: 10 }} tickFormatter={(s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Retention"]} labelFormatter={(s) => `${Math.floor(Number(s) / 60)}:${String(Number(s) % 60).padStart(2, "0")}`} />
                    <Area type="monotone" dataKey="retention_percent" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#retGrad)" />
                    {retentionChartData.filter((p) => p.isDropoff).map((p) => (
                      <ReferenceLine key={p.elapsed_seconds} x={p.elapsed_seconds} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.6} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                {hoveredSegment && (
                  <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-2">
                    <p className="text-xs text-primary font-medium">At {Math.floor(hoveredSegment.startSeconds / 60)}:{String(Math.floor(hoveredSegment.startSeconds % 60)).padStart(2, "0")}:</p>
                    <p className="text-xs text-foreground mt-0.5">"{hoveredSegment.text}"</p>
                  </div>
                )}
                {/* Drop-off zones */}
                {retentionChartData.filter((p) => p.isDropoff).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3" />{"Drop-off zones (>5% drop)"}</p>
                    <div className="space-y-1">
                      {retentionChartData.filter((p) => p.isDropoff).map((p) => {
                        const seg = transcript?.parsed_segments?.find((s) => p.elapsed_seconds >= s.startSeconds && p.elapsed_seconds <= s.endSeconds);
                        return (
                          <div key={p.elapsed_seconds} className="text-xs bg-destructive/5 border border-destructive/20 rounded p-1.5">
                            <span className="font-mono text-destructive">{Math.floor(p.elapsed_seconds / 60)}:{String(Math.floor(p.elapsed_seconds % 60)).padStart(2, "0")}</span>
                            <span className="text-muted-foreground ml-2">-{p.drop.toFixed(1)}% drop</span>
                            {seg && <span className="text-foreground ml-2">"{seg.text.slice(0, 80)}{seg.text.length > 80 ? "..." : ""}"</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Paste retention data (CSV format: seconds,percent)</p>
                <textarea value={retentionCsv} onChange={(e) => setRetentionCsv(e.target.value)} placeholder={"0,100\n30,95\n60,88\n90,72\n120,65"} className="w-full h-32 rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                <button onClick={handleRetentionPaste} disabled={!retentionCsv.trim()} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"><BarChart3 className="h-3 w-3" />Save Retention Data</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Repurpose */}
      {activeTab === "repurpose" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Content Repurposes</h3>
            <span className="text-xs text-muted-foreground">{repurposes.filter((r) => r.status === "published").length}/{repurposes.length} published</span>
          </div>

          {repurposes.length > 0 && (
            <div className="space-y-2">
              {repurposes.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{r.title}</span>
                  <span className="text-[10px] text-muted-foreground">{r.platform}</span>
                  <select
                    value={r.status}
                    onChange={(e) => updateRepurpose.mutate({ id: r.id, status: e.target.value })}
                    className="text-[10px] rounded border border-border bg-background px-1.5 py-0.5 text-foreground"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="published">Published</option>
                  </select>
                  <button onClick={() => deleteRepurpose.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add Repurpose</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={newRepurpose.platform} onChange={(e) => setNewRepurpose((p) => ({ ...p, platform: e.target.value }))} className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
                {["TikTok", "Instagram", "X", "LinkedIn", "Facebook", "Newsletter", "Blog"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newRepurpose.format} onChange={(e) => setNewRepurpose((p) => ({ ...p, format: e.target.value }))} className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
                {["clip", "short", "reel", "thread", "carousel", "post", "newsletter", "blog", "other"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <input type="text" value={newRepurpose.title} onChange={(e) => setNewRepurpose((p) => ({ ...p, title: e.target.value }))} placeholder="Repurpose title..." className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={handleAddRepurpose} disabled={!newRepurpose.title.trim()} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"><Plus className="h-3 w-3" />Add</button>
          </div>
        </div>
      )}

      {/* TAB: A/B Tests */}
      {activeTab === "ab-tests" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">A/B Tests</h3>

          {abTests.length > 0 && (
            <div className="space-y-2">
              {abTests.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground">{t.test_type}</span>
                    {t.winner && <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${t.winner === "a" ? "bg-blue-100 text-blue-700" : t.winner === "b" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>Winner: {t.winner.toUpperCase()}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg border p-2 ${t.winner === "a" ? "border-blue-300 bg-blue-50" : "border-border"}`}>
                      <p className="text-[10px] text-muted-foreground">Variant A</p>
                      <p className="text-xs text-foreground truncate">{t.variant_a}</p>
                      {t.variant_a_ctr != null && <p className="text-xs font-mono text-foreground mt-1">CTR: {t.variant_a_ctr}%</p>}
                    </div>
                    <div className={`rounded-lg border p-2 ${t.winner === "b" ? "border-green-300 bg-green-50" : "border-border"}`}>
                      <p className="text-[10px] text-muted-foreground">Variant B</p>
                      <p className="text-xs text-foreground truncate">{t.variant_b}</p>
                      {t.variant_b_ctr != null && <p className="text-xs font-mono text-foreground mt-1">CTR: {t.variant_b_ctr}%</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Log New A/B Test</p>
            <select value={newAbTest.testType} onChange={(e) => setNewAbTest((p) => ({ ...p, testType: e.target.value as "title" | "thumbnail" }))} className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
              <option value="title">Title</option>
              <option value="thumbnail">Thumbnail</option>
            </select>
            <input type="text" value={newAbTest.variantA} onChange={(e) => setNewAbTest((p) => ({ ...p, variantA: e.target.value }))} placeholder="Variant A (original)..." className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <input type="text" value={newAbTest.variantB} onChange={(e) => setNewAbTest((p) => ({ ...p, variantB: e.target.value }))} placeholder="Variant B (new)..." className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" value={newAbTest.variantACtr} onChange={(e) => setNewAbTest((p) => ({ ...p, variantACtr: e.target.value }))} placeholder="A CTR %" className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
              <input type="number" step="0.1" value={newAbTest.variantBCtr} onChange={(e) => setNewAbTest((p) => ({ ...p, variantBCtr: e.target.value }))} placeholder="B CTR %" className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
            </div>
            <select value={newAbTest.winner} onChange={(e) => setNewAbTest((p) => ({ ...p, winner: e.target.value as any }))} className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
              <option value="">No winner yet</option>
              <option value="a">Variant A wins</option>
              <option value="b">Variant B wins</option>
              <option value="inconclusive">Inconclusive</option>
            </select>
            <button onClick={handleAddAbTest} disabled={!newAbTest.variantA.trim() || !newAbTest.variantB.trim()} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"><Plus className="h-3 w-3" />Log Test</button>
          </div>
        </div>
      )}

      {/* TAB: YouTube Linking */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Link YouTube Video</h3>
          {linkedYtVideo ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{linkedYtVideo.title}</p>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs"><Eye className="h-3 w-3 text-blue-500" />{(linkedYtVideo.views ?? 0).toLocaleString()} views</span>
                <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-3 w-3 text-green-500" />{(linkedYtVideo.likes ?? 0).toLocaleString()} likes</span>
                <span className="flex items-center gap-1 text-xs"><MessageSquare className="h-3 w-3 text-orange-500" />{(linkedYtVideo.comments ?? 0).toLocaleString()} comments</span>
              </div>
              {linkedYtVideo.ctr_percent != null && <p className="text-xs text-muted-foreground mt-1">CTR: {linkedYtVideo.ctr_percent.toFixed(1)}%</p>}
              {linkedYtVideo.avg_view_duration_seconds != null && <p className="text-xs text-muted-foreground">Avg view: {Math.floor(linkedYtVideo.avg_view_duration_seconds / 60)}m {linkedYtVideo.avg_view_duration_seconds % 60}s</p>}
            </div>
          ) : video.status === "published" ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Select the YouTube video to link:</p>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {ytVideos.map((yt) => (
                  <button key={yt.id} onClick={() => handleLinkYouTube(yt.youtube_video_id)} className="w-full text-left flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/50 transition-colors">
                    <SiYoutube className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="flex-1 text-xs text-foreground truncate">{yt.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{(yt.views ?? 0).toLocaleString()} views</span>
                  </button>
                ))}
                {ytVideos.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No YouTube videos found. Sync your YouTube data first.</p>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Video must be published before linking to YouTube stats.</p>
          )}
        </div>
      )}
      {/* YouTube Link Prompt Dialog - shown when status changes to published */}
      {showYouTubeLinkPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <SiYoutube className="h-5 w-5 text-red-600" />
              <h3 className="text-base font-semibold text-foreground">Link YouTube Video</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This video is now published. Would you like to link it to a YouTube video to track performance?
            </p>
            <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
              {ytVideos.map((yt) => (
                <button
                  key={yt.id}
                  onClick={() => {
                    handleLinkYouTube(yt.youtube_video_id);
                    setShowYouTubeLinkPrompt(false);
                    onUpdate();
                  }}
                  className="w-full text-left flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <SiYoutube className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="flex-1 text-xs text-foreground truncate">{yt.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{(yt.views ?? 0).toLocaleString()} views</span>
                </button>
              ))}
              {ytVideos.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 text-center">No YouTube videos found. Sync your YouTube data first.</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowYouTubeLinkPrompt(false); onUpdate(); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
