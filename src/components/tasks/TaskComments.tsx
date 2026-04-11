import { useState, useEffect } from "react";
import { Send, Trash2, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTaskComments, useUnreadMentionCount, useMarkMentionsRead, extractMentions } from "@/hooks/use-task-comments";
import { MentionInput } from "@/components/tasks/MentionInput";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { safeFormat } from "@/lib/date-utils";

interface TaskCommentsProps {
  taskId: string;
}

/** Renders comment text with styled mention badges */
function CommentContent({ content }: { content: string }) {
  const MENTION_REGEX = /@\[([a-f0-9-]+):([^\]]+)\]/g;
  const parts: (string | { userId: string; name: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MENTION_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ userId: match[1], name: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return (
    <p className="text-sm mt-0.5 whitespace-pre-wrap">
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span
            key={i}
            className="inline-flex items-center rounded px-1 py-0.5 text-xs font-semibold bg-primary/15 text-primary"
          >
            @{part.name}
          </span>
        )
      )}
    </p>
  );
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [content, setContent] = useState("");
  const { comments, addComment, deleteComment } = useTaskComments(taskId);
  const { data: unreadCount = 0 } = useUnreadMentionCount(taskId);
  const markRead = useMarkMentionsRead(taskId);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Mark mentions as read when viewing comments
  useEffect(() => {
    if (unreadCount > 0) {
      markRead.mutate();
    }
  }, [unreadCount]);

  const handleSubmit = async () => {
    if (!content.trim() || !user?.id) return;
    await addComment.mutateAsync({ content: content.trim(), authorId: user.id });
    setContent("");
  };

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
          <AtSign className="h-3 w-3 mr-0.5" />
          {unreadCount} unread
        </Badge>
      )}

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {c.author_id.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {safeFormat(c.created_at, "MMM d, h:mm a")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteComment.mutate(c.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <CommentContent content={c.content} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <MentionInput
          value={content}
          onChange={setContent}
          onSubmit={handleSubmit}
          placeholder="Add a comment... Use @ to mention"
        />
        <Button size="icon" onClick={handleSubmit} disabled={!content.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
