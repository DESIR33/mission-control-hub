import { useState, useMemo } from "react";
import {
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Filter,
  Copy,
  Check,
  Bot,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useYouTubeComments,
  useSyncComments,
  useGenerateReply,
  useMarkReplied,
  useCommentStats,
  YouTubeComment,
} from "@/hooks/use-youtube-comments";
import { toast } from "sonner";
import { safeFormat } from "@/lib/date-utils";

const sentimentConfig: Record<
  YouTubeComment["sentiment"],
  { label: string; color: string; icon: typeof ThumbsUp }
> = {
  positive: { label: "Positive", color: "bg-green-100 text-green-800", icon: ThumbsUp },
  negative: { label: "Negative", color: "bg-red-100 text-red-800", icon: ThumbsDown },
  question: { label: "Question", color: "bg-blue-100 text-blue-800", icon: HelpCircle },
  neutral: { label: "Neutral", color: "bg-gray-100 text-gray-800", icon: MessageSquare },
};

const priorityConfig: Record<YouTubeComment["priority"], { label: string; color: string }> = {
  high: { label: "High", color: "bg-red-100 text-red-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Low", color: "bg-gray-100 text-gray-600" },
};

function CommentCard({
  comment,
  onGenerateReply,
  onMarkReplied,
  isGenerating,
}: {
  comment: YouTubeComment;
  onGenerateReply: (comment: YouTubeComment) => void;
  onMarkReplied: (id: string) => void;
  isGenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const sentiment = sentimentConfig[comment.sentiment];
  const priority = priorityConfig[comment.priority];
  const SentimentIcon = sentiment.icon;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Reply copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Author avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-muted-foreground">
              {comment.author_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">{comment.author_name}</span>
              <Badge variant="outline" className={sentiment.color}>
                <SentimentIcon className="w-3 h-3 mr-1" />
                {sentiment.label}
              </Badge>
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
              {comment.is_pinned && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  <Star className="w-3 h-3 mr-1" /> Pinned
                </Badge>
              )}
              {comment.is_replied && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Check className="w-3 h-3 mr-1" /> Replied
                </Badge>
              )}
            </div>

            {/* Comment text */}
            <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{comment.text}</p>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> {comment.like_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {comment.reply_count} replies
              </span>
              <span>{safeFormat(comment.published_at, "P")}</span>
            </div>

            {/* Suggested reply section */}
            {!comment.is_replied && comment.suggested_reply && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <Bot className="w-3 h-3" /> Suggested Reply
                </div>
                <p className="text-sm mb-2">{comment.suggested_reply}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(comment.suggested_reply!)}
                  >
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMarkReplied(comment.id)}
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark Replied
                  </Button>
                </div>
              </div>
            )}

            {/* Generate reply button */}
            {!comment.is_replied && !comment.suggested_reply && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerateReply(comment)}
                disabled={isGenerating}
              >
                <Bot className="w-3 h-3 mr-1" />
                {isGenerating ? "Generating..." : "Generate Reply"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommentsPage() {
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [repliedFilter, setRepliedFilter] = useState<string>("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: comments, isLoading } = useYouTubeComments();
  const { stats } = useCommentStats();
  const syncMutation = useSyncComments();
  const generateReplyMutation = useGenerateReply();
  const markRepliedMutation = useMarkReplied();

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    return comments.filter((c) => {
      if (search && !c.text.toLowerCase().includes(search.toLowerCase()) && !c.author_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (sentimentFilter !== "all" && c.sentiment !== sentimentFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (repliedFilter === "replied" && !c.is_replied) return false;
      if (repliedFilter === "unreplied" && c.is_replied) return false;
      return true;
    });
  }, [comments, search, sentimentFilter, priorityFilter, repliedFilter]);

  // Group by video
  const groupedComments = useMemo(() => {
    const groups: Record<string, { videoTitle: string; comments: YouTubeComment[] }> = {};
    for (const c of filteredComments) {
      if (!groups[c.video_id]) {
        groups[c.video_id] = { videoTitle: c.video_title, comments: [] };
      }
      groups[c.video_id].comments.push(c);
    }
    return Object.entries(groups);
  }, [filteredComments]);

  const handleGenerateReply = (comment: YouTubeComment) => {
    setGeneratingId(comment.id);
    generateReplyMutation.mutate(
      {
        commentId: comment.id,
        comment_text: comment.text,
        video_title: comment.video_title,
      },
      { onSettled: () => setGeneratingId(null) }
    );
  };

  const handleMarkReplied = (id: string) => {
    markRepliedMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Comment Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and respond to YouTube comments efficiently
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync Comments
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Comments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-orange-600">{stats.unreplied}</div>
            <div className="text-xs text-muted-foreground">Unreplied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.questions}</div>
            <div className="text-xs text-muted-foreground">Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <Input
              placeholder="Search comments or authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="question">Questions</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={repliedFilter} onValueChange={setRepliedFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="unreplied">Unreplied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comments list grouped by video */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-3 animate-pulse" />
                <div className="h-3 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groupedComments.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No comments found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {comments?.length
                ? "Try adjusting your filters"
                : "Sync your YouTube comments to get started"}
            </p>
            {!comments?.length && (
              <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync Comments
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        groupedComments.map(([videoId, group]) => (
          <div key={videoId}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {group.videoTitle}
              <Badge variant="secondary">{group.comments.length}</Badge>
            </h2>
            {group.comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onGenerateReply={handleGenerateReply}
                onMarkReplied={handleMarkReplied}
                isGenerating={generatingId === comment.id}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
