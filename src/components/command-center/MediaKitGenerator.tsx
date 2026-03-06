import { useState, useMemo, useCallback } from "react";
import {
  Share2,
  Copy,
  Check,
  Users,
  Eye,
  ThumbsUp,
  PlayCircle,
  Edit3,
  Link,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useChannelStats, useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useDemographics } from "@/hooks/use-youtube-analytics-api";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";

interface PricingTier {
  label: string;
  price: string;
  description: string;
}

const DEFAULT_TIERS: PricingTier[] = [
  { label: "Dedicated Video", price: "2500", description: "Full video dedicated to your product/service" },
  { label: "Integrated Mention", price: "1200", description: "60-90s integration within an existing video" },
  { label: "Shorts", price: "500", description: "Dedicated YouTube Short (< 60s)" },
  { label: "Bundle (3 Videos)", price: "5000", description: "3 integrated mentions across multiple videos" },
];

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export function MediaKitGenerator() {
  const { workspaceId } = useWorkspace();
  const { data: channelStats, isLoading: statsLoading } = useChannelStats();
  const { data: videos = [], isLoading: videosLoading } = useYouTubeVideoStats(50);
  const { data: demographics = [], isLoading: demoLoading } = useDemographics();

  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
  const [editingTiers, setEditingTiers] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isLoading = statsLoading || videosLoading || demoLoading;

  // Derived stats
  const stats = useMemo(() => {
    if (!channelStats) return null;

    const subs = channelStats.subscriber_count || 0;
    const totalViews = channelStats.total_view_count || 0;
    const videoCount = channelStats.video_count || 1;
    const avgViews = Math.round(totalViews / videoCount);

    // Engagement rate from recent videos
    const recentVideos = videos.slice(0, 20);
    const totalLikes = recentVideos.reduce((s, v) => s + (v.likes || 0), 0);
    const totalComments = recentVideos.reduce((s, v) => s + (v.comments || 0), 0);
    const totalVideoViews = recentVideos.reduce((s, v) => s + (v.views || 0), 0);
    const engagementRate =
      totalVideoViews > 0
        ? (((totalLikes + totalComments) / totalVideoViews) * 100).toFixed(2)
        : "0";

    return { subs, totalViews, avgViews, engagementRate, videoCount };
  }, [channelStats, videos]);

  // Top 5 videos by views
  const topVideos = useMemo(() => {
    // Deduplicate by youtube_video_id, keeping highest view count
    const seen = new Map<string, (typeof videos)[0]>();
    for (const v of videos) {
      const existing = seen.get(v.youtube_video_id);
      if (!existing || v.views > existing.views) {
        seen.set(v.youtube_video_id, v);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [videos]);

  // Aggregate demographics
  const demoBreakdown = useMemo(() => {
    if (!demographics.length) return { ageGroups: [], genderSplit: [] };

    // Aggregate by age group
    const ageMap = new Map<string, number>();
    const genderMap = new Map<string, number>();

    for (const d of demographics) {
      const currentAge = ageMap.get(d.age_group) ?? 0;
      ageMap.set(d.age_group, currentAge + d.viewer_percentage);

      const currentGender = genderMap.get(d.gender) ?? 0;
      genderMap.set(d.gender, currentGender + d.viewer_percentage);
    }

    const ageGroups = Array.from(ageMap.entries())
      .map(([group, pct]) => ({ group, pct: Math.round(pct * 100) / 100 }))
      .sort((a, b) => b.pct - a.pct);

    const genderSplit = Array.from(genderMap.entries())
      .map(([gender, pct]) => ({ gender: formatGender(gender), pct: Math.round(pct * 100) / 100 }))
      .sort((a, b) => b.pct - a.pct);

    return { ageGroups, genderSplit };
  }, [demographics]);

  const updateTier = useCallback(
    (idx: number, field: keyof PricingTier, value: string) => {
      setTiers((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );

  const handleGenerateShareLink = useCallback(async () => {
    if (!workspaceId || !stats) return;

    setGenerating(true);
    try {
      const shareToken = crypto.randomUUID();

      const snapshot = {
        workspace_id: workspaceId,
        share_token: shareToken,
        subscriber_count: stats.subs,
        total_views: stats.totalViews,
        avg_views_per_video: stats.avgViews,
        engagement_rate: parseFloat(stats.engagementRate),
        video_count: stats.videoCount,
        top_videos: topVideos.map((v) => ({
          title: v.title,
          views: v.views,
          youtube_video_id: v.youtube_video_id,
        })),
        demographics: {
          age_groups: demoBreakdown.ageGroups,
          gender_split: demoBreakdown.genderSplit,
        },
        pricing_tiers: tiers.map((t) => ({
          label: t.label,
          price: parseFloat(t.price) || 0,
          description: t.description,
        })),
        generated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("media_kit_snapshots" as any)
        .insert(snapshot as any);

      if (error) throw error;

      const link = `${window.location.origin}/media-kit/${shareToken}`;
      setShareLink(link);
      toast.success("Media kit snapshot saved and share link generated!");
    } catch (err: any) {
      console.error("Failed to generate share link:", err);
      toast.error(err?.message || "Failed to generate share link");
    } finally {
      setGenerating(false);
    }
  }, [workspaceId, stats, topVideos, demoBreakdown, tiers]);

  const handleCopy = useCallback(() => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [shareLink]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Media Kit Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Media Kit Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No channel data available.</p>
            <p className="text-xs mt-1">
              Connect your YouTube channel to generate a media kit.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Media Kit Generator
          <Badge
            variant="outline"
            className="ml-auto bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs"
          >
            Auto-Populated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview Card */}
        <div className="rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Channel Media Kit</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Live stats &middot; Updated automatically
            </p>
          </div>

          {/* Channel Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
              <Users className="w-4 h-4 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtNum(stats.subs)}
              </p>
              <p className="text-xs text-muted-foreground">Subscribers</p>
            </div>
            <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
              <Eye className="w-4 h-4 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtNum(stats.avgViews)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Views/Video</p>
            </div>
            <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
              <ThumbsUp className="w-4 h-4 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                {stats.engagementRate}%
              </p>
              <p className="text-xs text-muted-foreground">Engagement Rate</p>
            </div>
            <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
              <PlayCircle className="w-4 h-4 mx-auto text-red-500 mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtNum(stats.totalViews)}
              </p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </div>
          </div>

          <Separator />

          {/* Top 5 Videos */}
          {topVideos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Top Videos by Views
              </h3>
              <div className="space-y-1.5">
                {topVideos.map((v, idx) => (
                  <div
                    key={v.youtube_video_id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-4 text-right">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-foreground flex-1 truncate">
                      {v.title}
                    </p>
                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {fmtNum(v.views)} views
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Demographics */}
          {(demoBreakdown.ageGroups.length > 0 ||
            demoBreakdown.genderSplit.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Audience Demographics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                {demoBreakdown.genderSplit.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                      Gender
                    </p>
                    <div className="space-y-1">
                      {demoBreakdown.genderSplit.map((g) => (
                        <div key={g.gender} className="flex items-center gap-2">
                          <span className="text-xs text-foreground w-16">
                            {g.gender}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${g.pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                            {g.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age Groups */}
                {demoBreakdown.ageGroups.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                      Age Groups
                    </p>
                    <div className="space-y-1">
                      {demoBreakdown.ageGroups.map((a) => (
                        <div key={a.group} className="flex items-center gap-2">
                          <span className="text-xs text-foreground w-16">
                            {a.group}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-purple-500"
                              style={{ width: `${a.pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                            {a.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Pricing Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Sponsorship Pricing
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1"
                onClick={() => setEditingTiers((prev) => !prev)}
              >
                <Edit3 className="w-3 h-3" />
                {editingTiers ? "Done" : "Edit"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-card/60 p-3"
                >
                  {editingTiers ? (
                    <div className="space-y-1.5">
                      <Input
                        value={tier.label}
                        onChange={(e) => updateTier(idx, "label", e.target.value)}
                        className="h-7 text-xs font-semibold"
                        placeholder="Tier name"
                      />
                      <Input
                        type="number"
                        value={tier.price}
                        onChange={(e) => updateTier(idx, "price", e.target.value)}
                        className="h-7 text-xs font-mono"
                        placeholder="Price"
                        min={0}
                      />
                      <Input
                        value={tier.description}
                        onChange={(e) => updateTier(idx, "description", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-foreground">
                          {tier.label}
                        </p>
                        <p className="text-sm font-bold font-mono text-foreground">
                          ${parseFloat(tier.price).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tier.description}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            onClick={handleGenerateShareLink}
            disabled={generating}
            className="flex-1 gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link className="w-4 h-4" />
            )}
            {generating ? "Generating..." : "Generate Share Link"}
          </Button>

          {shareLink && (
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 gap-2"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy Share Link"}
            </Button>
          )}
        </div>

        {shareLink && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Share Link
            </Label>
            <p className="text-xs font-mono text-foreground break-all mt-1">
              {shareLink}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatGender(raw: string): string {
  switch (raw.toLowerCase()) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "user_specified":
      return "Other";
    default:
      return raw;
  }
}
