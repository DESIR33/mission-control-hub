import { useState } from "react";
import {
  MessageSquare, Eye, Flag, Check, ThumbsUp, Filter,
  MessageCircle, HelpCircle, Smile, Frown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYouTubeComments, useCommentStats, useUpdateCommentStatus } from "@/hooks/use-youtube-comments";
import { toast } from "sonner";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { formatDistanceToNow } from "date-fns";

const sentimentConfig: Record<string, { icon: any; color: string; label: string }> = {
  positive: { icon: Smile, color: "text-green-400", label: "Positive" },
  negative: { icon: Frown, color: "text-red-400", label: "Negative" },
  question: { icon: HelpCircle, color: "text-blue-400", label: "Question" },
  neutral: { icon: MessageCircle, color: "text-muted-foreground", label: "Neutral" },
};

export function CommentInbox() {
  const [sentimentFilter, setSentimentFilter] = useState<string>("");
  const { data: allComments = [], isLoading } = useYouTubeComments();
  const { stats } = useCommentStats();
  const updateStatus = useUpdateCommentStatus();

  // Client-side filtering
  const comments = allComments.filter((c) => {
    if (sentimentFilter && c.sentiment !== sentimentFilter) return false;
    return true;
  });

  const handleStatusChange = (id: string, updates: { is_replied?: boolean; is_pinned?: boolean }) => {
    updateStatus.mutate({ id, ...updates }, {
      onSuccess: () => toast.success("Comment updated"),
    });
  };

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.total ?? 0}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Unreplied</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.unreplied ?? 0}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">High Priority</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.highPriority ?? 0}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.questions ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <Select value={sentimentFilter} onValueChange={(v) => setSentimentFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="bg-muted/50 text-xs w-auto">
            <SelectValue placeholder="All Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="question">Questions</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{comments.length} comments</span>
      </div>

      {/* Comment List */}
      {comments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No comments found. Sync comments from the Integrations page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => {
            const sentiment = sentimentConfig[comment.sentiment || "neutral"];
            const SentimentIcon = sentiment.icon;

            return (
              <div key={comment.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <span className="text-xs font-bold text-muted-foreground">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground">{comment.author_name}</p>
                      <SentimentIcon className={`w-3 h-3 ${sentiment.color}`} />
                      <Badge variant="outline" className="text-xs">
                        {comment.is_replied ? "Replied" : "Unreplied"}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {safeFormatDistanceToNow(comment.published_at, { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{comment.text}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {comment.like_count}
                      </span>
                      {comment.video_title && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          on: {comment.video_title}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {!comment.is_replied && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => handleStatusChange(comment.id, { is_replied: true })}>
                          <Check className="w-3 h-3 mr-1" /> Mark Replied
                        </Button>
                      )}
                      {!comment.is_pinned && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => handleStatusChange(comment.id, { is_pinned: true })}>
                          <Flag className="w-3 h-3 mr-1" /> Pin
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
