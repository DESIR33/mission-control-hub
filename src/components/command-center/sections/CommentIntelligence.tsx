import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MessageSquare, Lightbulb, Heart, SmilePlus, ThumbsUp,
  UserPlus, Plus, CheckCircle, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  useCommentIntelligence,
  type ReplyQueueItem,
  type TopicIdea,
  type TopFan,
} from "@/hooks/use-comment-intelligence";
import {
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults,
  barDefaults, SEMANTIC_COLORS, fmtCount,
} from "@/lib/chart-theme";

function ReplyQueueTab() {
  const { replyQueue, markReplied } = useCommentIntelligence();

  const handleMarkReplied = (commentId: string) => {
    markReplied.mutate(
      { commentId },
      {
        onSuccess: () => toast.success("Marked as replied"),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  if (replyQueue.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">All caught up! No unanswered questions.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {replyQueue.slice(0, 20).map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border bg-card p-3 flex items-start gap-3"
        >
          {c.author_avatar ? (
            <img
              src={c.author_avatar}
              alt=""
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
              {c.sentiment && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {c.sentiment}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                <ThumbsUp className="w-3 h-3" /> {c.like_count}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{c.text}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              on: {c.video_title ?? c.youtube_video_id}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0"
            onClick={() => handleMarkReplied(c.id)}
            disabled={markReplied.isPending}
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Replied
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

function TopicIdeasTab() {
  const { topicIdeas, addToContentQueue } = useCommentIntelligence();

  const handleAdd = (idea: TopicIdea) => {
    addToContentQueue.mutate(
      {
        title: idea.comment.text.slice(0, 120),
        description: `Source: YouTube comment by ${idea.comment.author_name} on "${idea.comment.video_title ?? "a video"}".\n\nOriginal: "${idea.comment.text}"`,
      },
      {
        onSuccess: () => toast.success("Added to content queue!"),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  if (topicIdeas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No topic ideas found in comments yet.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {topicIdeas.slice(0, 20).map((idea, i) => (
        <motion.div
          key={idea.comment.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border bg-card p-3 flex items-start gap-3"
        >
          <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground line-clamp-2">{idea.comment.text}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{idea.matchedKeyword}</Badge>
              <span className="text-[10px] text-muted-foreground">
                by {idea.comment.author_name} · {idea.comment.like_count} likes
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0 gap-1"
            onClick={() => handleAdd(idea)}
            disabled={addToContentQueue.isPending}
          >
            <Plus className="w-3 h-3" /> Queue
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

function TopFansTab() {
  const { topFans, addToContacts } = useCommentIntelligence();

  const handleAddContact = (fan: TopFan) => {
    addToContacts.mutate(
      { name: fan.author_name, avatar_url: fan.author_avatar ?? undefined },
      {
        onSuccess: () => toast.success(`${fan.author_name} added to contacts!`),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  if (topFans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No fan data available yet.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {topFans.map((fan, i) => (
        <motion.div
          key={fan.author_name}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
        >
          {fan.author_avatar ? (
            <img
              src={fan.author_avatar}
              alt=""
              className="w-9 h-9 rounded-full shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <SmilePlus className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{fan.author_name}</p>
            <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{fan.total_comments} comments</span>
              <span>{fmtCount(fan.total_likes)} total likes</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0 gap-1"
            onClick={() => handleAddContact(fan)}
            disabled={addToContacts.isPending}
          >
            <UserPlus className="w-3 h-3" /> Contact
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: SEMANTIC_COLORS.positive,
  neutral: SEMANTIC_COLORS.neutral,
  negative: SEMANTIC_COLORS.negative,
  question: "#f59e0b",
};

function SentimentTab() {
  const { sentimentDistribution, videoSentiments } = useCommentIntelligence();

  const pieData = [
    { name: "Positive", value: sentimentDistribution.positive, fill: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: sentimentDistribution.neutral, fill: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: sentimentDistribution.negative, fill: SENTIMENT_COLORS.negative },
    { name: "Question", value: sentimentDistribution.question, fill: SENTIMENT_COLORS.question },
  ].filter((d) => d.value > 0);

  const total =
    sentimentDistribution.positive +
    sentimentDistribution.neutral +
    sentimentDistribution.negative +
    sentimentDistribution.question;

  const barData = videoSentiments.map((v) => ({
    name: v.video_title.length > 25 ? v.video_title.slice(0, 25) + "..." : v.video_title,
    positive: v.positive,
    neutral: v.neutral,
    negative: v.negative,
    question: v.question,
  }));

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No sentiment data available.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall distribution */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Overall Sentiment Distribution</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center space-y-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-foreground">
                  {((d.value / total) * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">({fmtCount(d.value)})</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Per-video sentiment bars */}
      {barData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Sentiment by Video</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid {...cartesianGridDefaults} horizontal />
                <XAxis type="number" {...xAxisDefaults} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...yAxisDefaults}
                  width={120}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="positive" stackId="s" fill={SENTIMENT_COLORS.positive} {...barDefaults} />
                <Bar dataKey="neutral" stackId="s" fill={SENTIMENT_COLORS.neutral} {...barDefaults} />
                <Bar dataKey="negative" stackId="s" fill={SENTIMENT_COLORS.negative} {...barDefaults} />
                <Bar dataKey="question" stackId="s" fill={SENTIMENT_COLORS.question} {...barDefaults} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function CommentIntelligence() {
  const { isLoading, replyQueue, topicIdeas, topFans } = useCommentIntelligence();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Comment Intelligence</h2>
      </div>

      <Tabs defaultValue="reply_queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reply_queue">
            Reply Queue ({replyQueue.length})
          </TabsTrigger>
          <TabsTrigger value="topic_ideas">
            Topic Ideas ({topicIdeas.length})
          </TabsTrigger>
          <TabsTrigger value="top_fans">
            Top Fans ({topFans.length})
          </TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="reply_queue">
          <ReplyQueueTab />
        </TabsContent>

        <TabsContent value="topic_ideas">
          <TopicIdeasTab />
        </TabsContent>

        <TabsContent value="top_fans">
          <TopFansTab />
        </TabsContent>

        <TabsContent value="sentiment">
          <SentimentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
