/**
 * Wraps the full Comments page content for embedding in YouTube Hub.
 * Re-exports the standalone CommentsPage content without the page wrapper.
 */
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
import { Card, CardContent } from "@/components/ui/card";
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
  comment, onGenerateReply, onMarkReplied, isGenerating,
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
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-muted-foreground">
              {comment.author_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
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
              {comment.replied && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Check className="w-3 h-3 mr-1" /> Replied
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground mb-2 whitespace-pre-line">{comment.text}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>{comment.like_count} likes</span>
              <span>on: {comment.video_title}</span>
            </div>
            {comment.ai_reply && (
              <div className="bg-muted/50 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Bot className="w-3 h-3" /> AI Suggested Reply
                </div>
                <p className="text-sm">{comment.ai_reply}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(comment.ai_reply!)}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  {!comment.replied && (
                    <Button size="sm" variant="outline" onClick={() => onMarkReplied(comment.id)}>
                      <Check className="w-3 h-3 mr-1" /> Mark Replied
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {!comment.ai_reply && (
                <Button size="sm" variant="outline" onClick={() => onGenerateReply(comment)} disabled={isGenerating}>
                  <Bot className="w-3 h-3 mr-1" /> Generate Reply
                </Button>
              )}
              {!comment.replied && !comment.ai_reply && (
                <Button size="sm" variant="ghost" onClick={() => onMarkReplied(comment.id)}>
                  <Check className="w-3 h-3 mr-1" /> Mark Replied
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentsFullContent() {
  const { data: comments = [], isLoading } = useYouTubeComments();
  const syncComments = useSyncComments();
  const generateReply = useGenerateReply();
  const markReplied = useMarkReplied();
  const { data: stats } = useCommentStats();

  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [repliedFilter, setRepliedFilter] = useState<string>("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (searchQuery && !c.text.toLowerCase().includes(searchQuery.toLowerCase()) && !c.author_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (sentimentFilter !== "all" && c.sentiment !== sentimentFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (repliedFilter === "replied" && !c.replied) return false;
      if (repliedFilter === "unreplied" && c.replied) return false;
      return true;
    });
  }, [comments, searchQuery, sentimentFilter, priorityFilter, repliedFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, YouTubeComment[]> = {};
    for (const c of filtered) {
      const key = c.video_title || "Unknown Video";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const handleGenerateReply = async (comment: YouTubeComment) => {
    setGeneratingId(comment.id);
    try {
      await generateReply.mutateAsync(comment.id);
      toast.success("Reply generated!");
    } catch (err: any) {
      toast.error("Failed to generate reply", { description: err.message });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleMarkReplied = async (id: string) => {
    try {
      await markReplied.mutateAsync(id);
      toast.success("Marked as replied");
    } catch (err: any) {
      toast.error("Failed to mark as replied", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Unreplied</p>
            <p className="text-xl font-bold text-amber-500">{stats.unreplied}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">High Priority</p>
            <p className="text-xl font-bold text-red-500">{stats.highPriority}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Questions</p>
            <p className="text-xl font-bold text-blue-500">{stats.questions}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search comments or authors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 bg-secondary"
        />
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Sentiment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="question">Question</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={repliedFilter} onValueChange={setRepliedFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="unreplied">Unreplied</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncComments.mutate()}
          disabled={syncComments.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncComments.isPending ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {/* Comments grouped by video */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No comments found matching your filters.</p>
        </div>
      ) : (
        grouped.map(([videoTitle, videoComments]) => (
          <div key={videoTitle}>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              {videoTitle}
              <Badge variant="secondary" className="text-xs">{videoComments.length}</Badge>
            </h3>
            {videoComments.map((comment) => (
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
