import { useState } from "react";
import { useGenerateThumbnail } from "@/hooks/use-thumbnail-lab";
import { BestPracticesPanel } from "./BestPracticesPanel";
import {
  Sparkles, FlaskConical, ChevronDown, ChevronRight,
  Check, X, Copy, Loader2, AlertTriangle, RotateCcw,
  Eye, MousePointerClick, Timer, BarChart3, BookOpen,
  Type, FileText, Tags, Image, Users, ArrowUpRight, ArrowDownRight, Minus, Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useVideoOptimizationExperiments, useSaveExperimentLesson, computeDelta } from "@/hooks/use-optimization-experiments";
import { useRollbackExperiment } from "@/hooks/use-video-strategist";
import { EXPERIMENT_STATUS_CONFIG } from "@/types/strategist";
import { fmtCount } from "@/lib/chart-theme";
import { safeFormat } from "@/lib/date-utils";

// ── Types & Constants ──

interface VideoProposal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  confidence: number | null;
  content: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  video_title_optimization: { icon: Type, label: "Title", color: "text-blue-500" },
  video_description_optimization: { icon: FileText, label: "Description", color: "text-emerald-500" },
  video_tags_optimization: { icon: Tags, label: "Tags", color: "text-amber-500" },
  video_thumbnail_optimization: { icon: Image, label: "Thumbnail", color: "text-purple-500" },
};

// ── Hooks ──

function useVideoProposals(videoId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<VideoProposal[]>({
    queryKey: ["video-proposals", workspaceId, videoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_proposals")
        .select("id, title, description, type, status, confidence, content, metadata, created_at")
        .eq("workspace_id", workspaceId!)
        .eq("video_id", videoId!)
        .in("type", [
          "video_title_optimization",
          "video_description_optimization",
          "video_tags_optimization",
          "video_thumbnail_optimization",
        ])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId && !!videoId,
  });
}

function useApplyProposal() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, videoId }: { id: string; videoId: string }) => {
      // Approve the proposal
      const { error } = await (supabase as any)
        .from("ai_proposals")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Execute through the edge function to create experiment tracking
      if (workspaceId) {
        const { error: execError } = await supabase.functions.invoke("execute-proposal", {
          body: { proposal_id: id, workspace_id: workspaceId },
        });
        if (execError) console.warn("Execute proposal warning:", execError);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-proposals"] });
      qc.invalidateQueries({ queryKey: ["video-optimization-experiments"] });
      qc.invalidateQueries({ queryKey: ["active-experiments"] });
      toast.success("Optimization applied — experiment tracking started");
    },
  });
}

function useDismissProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("ai_proposals")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-proposals"] });
      toast.info("Suggestion dismissed");
    },
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

// ── Proposal Content Renderers ──

function TitleProposalContent({ content }: { content: Record<string, any> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Current: <span className="font-medium text-foreground">{content.current_title}</span>
      </p>
      <div className="space-y-1.5">
        {(content.title_options || []).map((opt: any, i: number) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{opt.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.rationale}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => copyToClipboard(opt.title)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DescriptionProposalContent({ content }: { content: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);
  const desc = content.optimized_description || "";
  const preview = desc.length > 200 ? desc.slice(0, 200) + "…" : desc;

  return (
    <div className="space-y-2">
      {content.rationale && <p className="text-xs text-muted-foreground">{content.rationale}</p>}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {expanded ? desc : preview}
        </pre>
        {desc.length > 200 && (
          <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Less" : "More"}
          </Button>
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(desc)}>
        <Copy className="w-3 h-3 mr-1" /> Copy Description
      </Button>
    </div>
  );
}

function TagsProposalContent({ content }: { content: Record<string, any> }) {
  const tags = content.suggested_tags || [];
  return (
    <div className="space-y-2">
      {content.rationale && <p className="text-xs text-muted-foreground">{content.rationale}</p>}
      <div className="flex flex-wrap gap-1">
        {tags.map((tag: string, i: number) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">{tag}</Badge>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(tags.join(", "))}>
        <Copy className="w-3 h-3 mr-1" /> Copy All Tags
      </Button>
    </div>
  );
}

function ThumbnailProposalContent({ content }: { content: Record<string, any> }) {
  const generateThumbnail = useGenerateThumbnail();
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelfieUrl(url);
    toast.success("Selfie uploaded — it will be composited with generated backgrounds");
  };

  const handleGenerate = async (prompt: string, idx: number) => {
    setGeneratingIdx(idx);
    try {
      const result = await generateThumbnail.mutateAsync({ prompt, model: "nano-banana-2" });
      if (result?.image_url) {
        setGeneratedImages(prev => ({ ...prev, [idx]: result.image_url }));
        toast.success("Thumbnail background generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGeneratingIdx(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selfie Upload */}
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Your Selfie / Face Photo</span>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleSelfieUpload} />
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
              {selfieUrl ? "Change Photo" : "Upload Photo"}
            </Badge>
          </label>
          {selfieUrl && (
            <img src={selfieUrl} alt="Selfie" className="w-8 h-8 rounded-full object-cover border border-border" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Upload your face photo to composite with generated thumbnail backgrounds. The AI generates the background — you add yourself in post.
        </p>
      </div>

      {/* Thumbnail Concepts */}
      {(content.thumbnail_concepts || []).map((concept: any, i: number) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          {/* Concept Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{concept.concept}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">Emotion:</span> {concept.emotional_hook} · 
                <span className="font-medium text-foreground ml-1">Layout:</span> {concept.composition}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">Concept {i + 1}</Badge>
          </div>

          {/* Text Overlay */}
          <div className="rounded-md bg-card border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Text Overlay</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-black text-foreground tracking-tight">{concept.text_overlay}</p>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(concept.text_overlay)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            {concept.text_style && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">{concept.text_style}</p>
            )}
          </div>

          {/* Nano Banana 2 Prompt */}
          {concept.nano_banana_prompt && (
            <div className="rounded-md bg-card border border-border p-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nano Banana 2 Prompt</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(concept.nano_banana_prompt)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-foreground leading-relaxed font-mono bg-muted/50 rounded p-2">
                {concept.nano_banana_prompt}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs gap-1.5 w-full"
                disabled={generatingIdx === i}
                onClick={() => handleGenerate(concept.nano_banana_prompt, i)}
              >
                {generatingIdx === i ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Generate with Replicate</>
                )}
              </Button>
            </div>
          )}

          {/* Generated Image Preview */}
          {generatedImages[i] && (
            <div className="rounded-md overflow-hidden border border-border relative">
              <img src={generatedImages[i]} alt={`Generated concept ${i + 1}`} className="w-full aspect-video object-cover" />
              {selfieUrl && (
                <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-1">
                  <p className="text-[10px] text-white">Composite your selfie in your editor</p>
                </div>
              )}
              <div className="p-2 bg-card flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(generatedImages[i])}>
                  <Copy className="w-3 h-3 mr-1" /> Copy URL
                </Button>
                <a href={generatedImages[i]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-auto">
                  Open Full Size ↗
                </a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompetitorInsights({ metadata }: { metadata: Record<string, any> }) {
  const competitorData = metadata?.competitor_data as Array<{ title: string; channel: string; views: number; published?: string }> | undefined;
  const insights = metadata?.competitor_insights as string | undefined;
  if (!competitorData?.length && !insights) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground w-full justify-start">
          <Users className="w-3 h-3" />
          Competitor Comparison ({competitorData?.length || 0} videos)
          <ChevronDown className="w-3 h-3 ml-auto" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {insights && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">{insights}</p>}
        {competitorData?.map((cv, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2">
            <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{cv.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {cv.channel} · {cv.views?.toLocaleString()} views{cv.published ? ` · ${cv.published}` : ""}
              </p>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Proposal Card (expandable) ──

function ProposalCard({ proposal, videoId }: { proposal: VideoProposal; videoId: string }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[proposal.type] || { icon: Sparkles, label: "Optimization", color: "text-primary" };
  const Icon = meta.icon;
  const apply = useApplyProposal();
  const dismiss = useDismissProposal();
  const content = proposal.content || {};
  const metadata = proposal.metadata || {};
  const isActioned = proposal.status !== "pending";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${isActioned ? "opacity-60 border-border" : "border-border hover:border-primary/30"}`}>
      {/* Clickable header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{meta.label} Optimization</h4>
            {proposal.confidence && (
              <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                {Math.round(proposal.confidence * 100)}%
              </Badge>
            )}
            {isActioned && (
              <Badge variant={proposal.status === "approved" ? "default" : "secondary"} className="text-[10px] shrink-0">
                {proposal.status}
              </Badge>
            )}
          </div>
          {proposal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{proposal.description}</p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Content by type */}
          {proposal.type === "video_title_optimization" && <TitleProposalContent content={content} />}
          {proposal.type === "video_description_optimization" && <DescriptionProposalContent content={content} />}
          {proposal.type === "video_tags_optimization" && <TagsProposalContent content={content} />}
          {proposal.type === "video_thumbnail_optimization" && <ThumbnailProposalContent content={content} />}

          <CompetitorInsights metadata={metadata} />

          {/* Actions */}
          {!isActioned && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => apply.mutate({ id: proposal.id, videoId })}
                disabled={apply.isPending}
              >
                {apply.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Apply & Track Experiment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => dismiss.mutate(proposal.id)}
                disabled={dismiss.isPending}
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </Button>
              <p className="text-[10px] text-muted-foreground ml-auto">
                Applying will start an A/B experiment to track performance changes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experiment Delta Badge ──

function DeltaBadge({ delta }: { delta: { percent: number; positive: boolean } | null }) {
  if (!delta) return <span className="text-xs text-muted-foreground">—</span>;
  const Icon = delta.positive ? ArrowUpRight : delta.percent === 0 ? Minus : ArrowDownRight;
  const color = delta.positive ? "text-green-500" : delta.percent === 0 ? "text-muted-foreground" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {delta.percent > 0 ? "+" : ""}{delta.percent.toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, icon: MIcon, baseline, result }: {
  label: string; icon: React.ElementType; baseline: number; result: number | null;
}) {
  const delta = computeDelta(baseline, result);
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MIcon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground">Before: </span>
          <span className="text-sm font-mono font-semibold text-foreground">{fmtCount(baseline)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">After: </span>
          <span className="text-sm font-mono font-semibold text-foreground">{result != null ? fmtCount(result) : "—"}</span>
        </div>
      </div>
      <DeltaBadge delta={delta} />
    </div>
  );
}

// ── Experiment Card ──

function ExperimentCard({ experiment }: { experiment: any }) {
  const [open, setOpen] = useState(experiment.status === "active");
  const [lessonText, setLessonText] = useState(experiment.lesson_learned || "");
  const [editingLesson, setEditingLesson] = useState(false);
  const saveLesson = useSaveExperimentLesson();
  const rollback = useRollbackExperiment();
  const statusConfig = EXPERIMENT_STATUS_CONFIG[experiment.status] || { label: experiment.status, color: "" };
  const daysRunning = differenceInDays(new Date(), new Date(experiment.started_at));
  const typeLabel = experiment.experiment_type?.replace(/_/g, " ") || "multi";

  const viewsDelta = computeDelta(experiment.baseline_views, experiment.result_views);
  const ctrDelta = computeDelta(experiment.baseline_ctr, experiment.result_ctr);

  const chartData = [
    { metric: "Views", before: experiment.baseline_views, after: experiment.result_views },
    { metric: "CTR %", before: experiment.baseline_ctr, after: experiment.result_ctr },
    { metric: "Impressions", before: experiment.baseline_impressions, after: experiment.result_impressions },
  ].filter(d => d.before > 0 || (d.after ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Collapsed header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <FlaskConical className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground capitalize truncate">{typeLabel}</h4>
            <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${statusConfig.color}`}>{statusConfig.label}</Badge>
            {viewsDelta && (
              <span className={`text-xs font-mono ${viewsDelta.positive ? "text-green-500" : "text-red-500"}`}>
                Views {viewsDelta.percent > 0 ? "+" : ""}{viewsDelta.percent.toFixed(0)}%
              </span>
            )}
            {ctrDelta && (
              <span className={`text-xs font-mono ${ctrDelta.positive ? "text-green-500" : "text-red-500"}`}>
                CTR {ctrDelta.percent > 0 ? "+" : ""}{ctrDelta.percent.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {safeFormat(experiment.started_at, "MMM d, yyyy")} · {daysRunning}d
          </p>
        </div>
        {experiment.status === "active" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 shrink-0"
            onClick={(e) => { e.stopPropagation(); rollback.mutate(experiment.id); }}
            disabled={rollback.isPending}
          >
            <RotateCcw className="w-3 h-3" /> Rollback
          </Button>
        )}
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* What changed */}
          {experiment.original_title && experiment.new_title && experiment.original_title !== experiment.new_title && (
            <div className="text-xs space-y-0.5 rounded-lg bg-muted/30 p-3">
              <p className="text-muted-foreground">Title: <span className="line-through">{experiment.original_title}</span></p>
              <p className="text-foreground font-medium">→ {experiment.new_title}</p>
            </div>
          )}
          {experiment.new_tags && (
            <div className="flex flex-wrap gap-1">
              {experiment.new_tags.map((t: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard label="Views" icon={Eye} baseline={experiment.baseline_views} result={experiment.result_views} />
            <MetricCard label="CTR" icon={MousePointerClick} baseline={experiment.baseline_ctr} result={experiment.result_ctr} />
            <MetricCard label="Impressions" icon={BarChart3} baseline={experiment.baseline_impressions} result={experiment.result_impressions} />
            <MetricCard label="Avg Duration" icon={Timer} baseline={experiment.baseline_avg_view_duration} result={experiment.result_avg_view_duration} />
          </div>

          {/* Chart */}
          {chartData.length > 0 && experiment.result_views != null && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Before vs After</h5>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtCount} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="before" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Before" />
                  <Bar dataKey="after" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="After" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Lesson */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Lesson Learned (feeds AI agents)</span>
            </div>
            {editingLesson ? (
              <div className="space-y-2">
                <Textarea
                  value={lessonText}
                  onChange={(e) => setLessonText(e.target.value)}
                  placeholder="What did we learn? e.g. 'Questions in titles boost CTR by ~15% for tutorial content'"
                  className="text-sm min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { saveLesson.mutate({ experimentId: experiment.id, lesson: lessonText }); setEditingLesson(false); }} disabled={saveLesson.isPending}>
                    Save Lesson
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingLesson(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setEditingLesson(true)}
              >
                {experiment.lesson_learned || "Click to add a lesson learned — this will be used by AI agents for future optimizations."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Hub Component ──

export function VideoOptimizationHub({ youtubeVideoId }: { youtubeVideoId?: string }) {
  const { data: proposals = [], isLoading: loadingProposals } = useVideoProposals(youtubeVideoId);
  const { data: experiments = [], isLoading: loadingExperiments } = useVideoOptimizationExperiments(youtubeVideoId);

  const pending = proposals.filter((p) => p.status === "pending");
  const actioned = proposals.filter((p) => p.status !== "pending");
  const activeExperiments = experiments.filter((e) => e.status === "active");
  const completedExperiments = experiments.filter((e) => e.status !== "active");

  const isLoading = loadingProposals || loadingExperiments;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading optimizations…</p>
      </div>
    );
  }

  const hasNothing = proposals.length === 0 && experiments.length === 0;

  if (hasNothing) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">No optimizations yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Click <span className="font-medium text-foreground">Optimize Video</span> above to generate AI-powered suggestions. 
          Each applied change will be tracked as an experiment so you can measure its impact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Experiments */}
      {activeExperiments.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            Active Experiments ({activeExperiments.length})
          </h3>
          {activeExperiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </section>
      )}

      {/* Pending Suggestions */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Optimization Suggestions ({pending.length})
          </h3>
          <p className="text-xs text-muted-foreground -mt-1">
            Click to expand, review the details, then apply to start tracking the experiment.
          </p>
          {pending.map((p) => (
            <ProposalCard key={p.id} proposal={p} videoId={youtubeVideoId!} />
          ))}
        </section>
      )}

      {/* Completed Experiments */}
      {completedExperiments.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Experiment History ({completedExperiments.length})
          </h3>
          {completedExperiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </section>
      )}

      {/* Previous Suggestions */}
      {actioned.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            {actioned.length} previous suggestion{actioned.length > 1 ? "s" : ""}
          </summary>
          <div className="space-y-3 mt-3">
            {actioned.map((p) => (
              <ProposalCard key={p.id} proposal={p} videoId={youtubeVideoId!} />
            ))}
          </div>
        </details>
      )}

      {/* Best Practices Memory */}
      <BestPracticesPanel />
    </div>
  );
}
