import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Sparkles, Type, FileText, Tags, Image, Check, X, Copy,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Users, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

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
  return useMutation({
    mutationFn: async ({ id }: { id: string; videoId: string }) => {
      const { error } = await (supabase as any)
        .from("ai_proposals")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-proposals"] });
      toast.success("Proposal approved");
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
      toast.info("Proposal dismissed");
    },
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

// ── Competitor Insights Section ──
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
        {insights && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">{insights}</p>
        )}
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

// ── Title Proposal Card ──
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

// ── Description Proposal Card ──
function DescriptionProposalContent({ content }: { content: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);
  const desc = content.optimized_description || "";
  const preview = desc.length > 200 ? desc.slice(0, 200) + "…" : desc;

  return (
    <div className="space-y-2">
      {content.rationale && (
        <p className="text-xs text-muted-foreground">{content.rationale}</p>
      )}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {expanded ? desc : preview}
        </pre>
        {desc.length > 200 && (
          <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
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

// ── Tags Proposal Card ──
function TagsProposalContent({ content }: { content: Record<string, any> }) {
  const tags = content.suggested_tags || [];
  return (
    <div className="space-y-2">
      {content.rationale && (
        <p className="text-xs text-muted-foreground">{content.rationale}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {tags.map((tag: string, i: number) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">
            {tag}
          </Badge>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(tags.join(", "))}>
        <Copy className="w-3 h-3 mr-1" /> Copy All Tags
      </Button>
    </div>
  );
}

// ── Thumbnail Proposal Card ──
function ThumbnailProposalContent({ content }: { content: Record<string, any> }) {
  return (
    <div className="space-y-2">
      {(content.thumbnail_concepts || []).map((concept: any, i: number) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
          <p className="text-sm font-medium text-foreground">{concept.concept}</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Text:</span> {concept.text_overlay}
            </div>
            <div>
              <span className="font-medium text-foreground">Emotion:</span> {concept.emotional_hook}
            </div>
            <div>
              <span className="font-medium text-foreground">Layout:</span> {concept.composition}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single Proposal Card ──
function ProposalCard({ proposal, videoId }: { proposal: VideoProposal; videoId: string }) {
  const meta = TYPE_META[proposal.type] || { icon: Sparkles, label: "Optimization", color: "text-primary" };
  const Icon = meta.icon;
  const apply = useApplyProposal();
  const dismiss = useDismissProposal();
  const content = proposal.content || {};
  const metadata = proposal.metadata || {};
  const isActioned = proposal.status !== "pending";

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 ${isActioned ? "opacity-60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <h4 className="text-sm font-semibold text-foreground">{meta.label} Optimization</h4>
          {proposal.confidence && (
            <Badge variant="outline" className="text-[10px] h-5">
              {Math.round(proposal.confidence * 100)}% conf
            </Badge>
          )}
          {metadata.health_score != null && (
            <Badge variant={metadata.health_score < 30 ? "destructive" : "secondary"} className="text-[10px] h-5">
              Health: {Math.round(metadata.health_score)}
            </Badge>
          )}
        </div>
        {!isActioned && (
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => apply.mutate({ id: proposal.id, videoId })}
              disabled={apply.isPending}
            >
              <Check className="w-3 h-3" /> Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => dismiss.mutate(proposal.id)}
              disabled={dismiss.isPending}
            >
              <X className="w-3 h-3" /> Dismiss
            </Button>
          </div>
        )}
        {isActioned && (
          <Badge variant={proposal.status === "approved" ? "default" : "secondary"} className="text-[10px]">
            {proposal.status}
          </Badge>
        )}
      </div>

      {proposal.description && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
          {proposal.description}
        </p>
      )}

      {proposal.type === "video_title_optimization" && <TitleProposalContent content={content} />}
      {proposal.type === "video_description_optimization" && <DescriptionProposalContent content={content} />}
      {proposal.type === "video_tags_optimization" && <TagsProposalContent content={content} />}
      {proposal.type === "video_thumbnail_optimization" && <ThumbnailProposalContent content={content} />}

      <CompetitorInsights metadata={metadata} />
    </div>
  );
}

// ── Main Panel ──
export function VideoOptimizationPanel({ youtubeVideoId }: { youtubeVideoId?: string }) {
  const { data: proposals = [], isLoading } = useVideoProposals(youtubeVideoId);

  const pending = proposals.filter((p) => p.status === "pending");
  const actioned = proposals.filter((p) => p.status !== "pending");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading optimization suggestions…</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No optimization suggestions yet. Click <span className="font-medium text-foreground">Optimize Video</span> to generate AI-powered recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Pending Suggestions ({pending.length})
          </h3>
          {pending.map((p) => (
            <ProposalCard key={p.id} proposal={p} videoId={youtubeVideoId!} />
          ))}
        </div>
      )}

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
    </div>
  );
}
