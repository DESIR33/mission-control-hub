import { useMemo } from "react";
import {
  MessageSquare, Star, AlertCircle, Handshake, HelpCircle,
  Heart, TrendingUp, Users, Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useYouTubeComments, useCommentStats } from "@/hooks/use-youtube-comments";
import type { YouTubeComment } from "@/hooks/use-youtube-comments";

const categoryConfig: Record<string, { label: string; icon: typeof Star; color: string }> = {
  positive: { label: "Positive", icon: Heart, color: "text-green-400 bg-green-400/10" },
  negative: { label: "Criticism", icon: AlertCircle, color: "text-red-400 bg-red-400/10" },
  question: { label: "Question", icon: HelpCircle, color: "text-blue-400 bg-blue-400/10" },
  neutral: { label: "Neutral", icon: MessageSquare, color: "text-gray-400 bg-gray-400/10" },
};

interface SuperFan {
  name: string;
  channelUrl: string | null;
  avatarUrl: string | null;
  commentCount: number;
  totalLikes: number;
  latestComment: string;
}

interface BusinessOpportunity {
  comment: YouTubeComment;
  type: "collab_request" | "sponsor_interest" | "feature_request";
  confidence: "high" | "medium";
}

function detectBusinessOpportunity(comment: YouTubeComment): BusinessOpportunity | null {
  const text = comment.text_display.toLowerCase();

  // Collaboration signals
  const collabSignals = ["collab", "collaborate", "let's work together", "partner", "would love to work", "feature you", "have you on"];
  if (collabSignals.some((s) => text.includes(s))) {
    return { comment, type: "collab_request", confidence: "high" };
  }

  // Sponsor interest signals
  const sponsorSignals = ["sponsor", "brand deal", "partnership opportunity", "would like to sponsor", "advertising", "promote our"];
  if (sponsorSignals.some((s) => text.includes(s))) {
    return { comment, type: "sponsor_interest", confidence: "high" };
  }

  // Feature/content request signals
  const requestSignals = ["can you make a video", "please cover", "tutorial on", "would love to see", "can you do", "video about"];
  if (requestSignals.some((s) => text.includes(s))) {
    return { comment, type: "feature_request", confidence: "medium" };
  }

  return null;
}

export function CommentInsights() {
  const { data: comments = [] } = useYouTubeComments();
  const { data: stats } = useCommentStats();

  const { superFans, opportunities, sentimentBreakdown } = useMemo(() => {
    // Find super fans (3+ comments)
    const authorMap = new Map<string, SuperFan>();
    for (const comment of comments) {
      const key = comment.author_name;
      const existing = authorMap.get(key);
      if (existing) {
        existing.commentCount++;
        existing.totalLikes += comment.like_count;
        existing.latestComment = comment.text_display;
      } else {
        authorMap.set(key, {
          name: comment.author_name,
          channelUrl: comment.author_channel_url,
          avatarUrl: comment.author_avatar_url,
          commentCount: 1,
          totalLikes: comment.like_count,
          latestComment: comment.text_display,
        });
      }
    }

    const superFans = Array.from(authorMap.values())
      .filter((f) => f.commentCount >= 3)
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 10);

    // Detect business opportunities
    const opportunities: BusinessOpportunity[] = [];
    for (const comment of comments) {
      const opp = detectBusinessOpportunity(comment);
      if (opp) opportunities.push(opp);
    }

    // Sentiment breakdown
    const sentimentBreakdown = {
      positive: comments.filter((c) => c.sentiment === "positive").length,
      negative: comments.filter((c) => c.sentiment === "negative").length,
      question: comments.filter((c) => c.sentiment === "question").length,
      neutral: comments.filter((c) => c.sentiment === "neutral" || !c.sentiment).length,
    };

    return { superFans, opportunities, sentimentBreakdown };
  }, [comments]);

  const total = comments.length;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reply Rate</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{(stats?.replyRate ?? 0).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Super Fans</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{superFans.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Handshake className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opportunities</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{opportunities.length}</p>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      {total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Sentiment Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(sentimentBreakdown).map(([key, count]) => {
              const config = categoryConfig[key];
              if (!config) return null;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${config.color.split(" ")[0]}`} />
                  <span className="text-xs text-muted-foreground w-16">{config.label}</span>
                  <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.color.split(" ")[0].replace("text-", "bg-")}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-12 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Business Opportunities */}
      {opportunities.length > 0 && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Handshake className="w-3.5 h-3.5 text-purple-400" />
            Business Opportunities ({opportunities.length})
          </h3>
          <div className="space-y-2">
            {opportunities.slice(0, 8).map((opp) => (
              <div
                key={opp.comment.id}
                className="rounded-md border border-border bg-card p-2.5"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {opp.comment.author_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          opp.type === "collab_request"
                            ? "bg-blue-500/15 text-blue-400 border-blue-400/30"
                            : opp.type === "sponsor_interest"
                            ? "bg-green-500/15 text-green-400 border-green-400/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-400/30"
                        }`}
                      >
                        {opp.type === "collab_request"
                          ? "Collab Request"
                          : opp.type === "sponsor_interest"
                          ? "Sponsor Interest"
                          : "Content Request"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          opp.confidence === "high"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {opp.confidence}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {opp.comment.text_display}
                    </p>
                    {opp.comment.video_title && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        on: {opp.comment.video_title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Super Fans */}
      {superFans.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-yellow-500" />
            Super Fans ({superFans.length})
          </h3>
          <div className="space-y-2">
            {superFans.map((fan) => (
              <div
                key={fan.name}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                {fan.avatarUrl ? (
                  <img
                    src={fan.avatarUrl}
                    alt={fan.name}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {fan.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {fan.latestComment}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-foreground">
                    {fan.commentCount}
                  </p>
                  <p className="text-[9px] text-muted-foreground">comments</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            No comments synced yet. Sync your YouTube comments to see insights, super fans, and business opportunities.
          </p>
        </div>
      )}
    </div>
  );
}
