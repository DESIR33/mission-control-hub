import { useState } from "react";
import {
  MessageSquare, Eye, Flag, Check, ThumbsUp, Filter,
  MessageCircle, HelpCircle, Smile, Frown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useYouTubeComments, useCommentStats, useUpdateCommentStatus } from "@/hooks/use-youtube-comments";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const sentimentConfig: Record<string, { icon: any; color: string; label: string }> = {
  positive: { icon: Smile, color: "text-green-400", label: "Positive" },
  negative: { icon: Frown, color: "text-red-400", label: "Negative" },
  question: { icon: HelpCircle, color: "text-blue-400", label: "Question" },
  neutral: { icon: MessageCircle, color: "text-gray-400", label: "Neutral" },
};

export function CommentInbox() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("");
  const { data: comments = [], isLoading } = useYouTubeComments({
    status: statusFilter || undefined,
    sentiment: sentimentFilter || undefined,
  });
  const { data: stats } = useCommentStats();
  const updateStatus = useUpdateCommentStatus();

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => toast.success(`Comment marked as ${status}`),
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
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Unread</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{stats?.unread ?? 0}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reply Rate</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {(stats?.replyRate ?? 0).toFixed(1)}%
          </p>
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
        <select
          className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="flagged">Flagged</option>
        </select>
        <select
          className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
        >
          <option value="">All Sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="question">Questions</option>
        </select>
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
                    {comment.author_avatar_url ? (
                      <img src={comment.author_avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground">{comment.author_name}</p>
                      <SentimentIcon className={`w-3 h-3 ${sentiment.color}`} />
                      <Badge variant="outline" className="text-xs">
                        {comment.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(comment.published_at), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{comment.text_display}</p>

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
                      {comment.status === "unread" && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => handleStatusChange(comment.id, "read")}>
                          <Eye className="w-3 h-3 mr-1" /> Read
                        </Button>
                      )}
                      {comment.status !== "replied" && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => handleStatusChange(comment.id, "replied")}>
                          <Check className="w-3 h-3 mr-1" /> Replied
                        </Button>
                      )}
                      {comment.status !== "flagged" && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => handleStatusChange(comment.id, "flagged")}>
                          <Flag className="w-3 h-3 mr-1" /> Flag
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
