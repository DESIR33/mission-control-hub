import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareIcon, SendIcon, Loader2Icon } from "lucide-react";
import { useEmailComments, useAddEmailComment } from "@/hooks/use-email-comments";
import { safeFormat } from "@/lib/date-utils";

interface TeamCommentsPanelProps {
  emailId: string;
}

export function TeamCommentsPanel({ emailId }: TeamCommentsPanelProps) {
  const { data: comments = [], isLoading } = useEmailComments(emailId);
  const addComment = useAddEmailComment();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ emailId, content: newComment }, {
      onSuccess: () => setNewComment(""),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Team Comments</span>
        {comments.length > 0 && (
          <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">{comments.length}</span>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-muted/50 p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {comment.profile?.full_name || comment.profile?.email || "Team member"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {safeFormat(comment.created_at, "MMM d, hh:mm a")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{comment.content}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add internal note..."
          rows={2}
          className="text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button size="sm" variant="outline" className="shrink-0" onClick={handleSubmit} disabled={addComment.isPending}>
          {addComment.isPending ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SendIcon className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
