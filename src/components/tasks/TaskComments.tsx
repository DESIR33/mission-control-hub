import { useState } from "react";
import { format } from "date-fns";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTaskComments } from "@/hooks/use-task-comments";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [content, setContent] = useState("");
  const { comments, addComment, deleteComment } = useTaskComments(taskId);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const handleSubmit = async () => {
    if (!content.trim() || !user?.id) return;
    await addComment.mutateAsync({ content: content.trim(), authorId: user.id });
    setContent("");
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Comments</h4>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
              {c.author_id.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "MMM d, h:mm a")}
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
              <p className="text-sm mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
        />
        <Button size="icon" onClick={handleSubmit} disabled={!content.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
