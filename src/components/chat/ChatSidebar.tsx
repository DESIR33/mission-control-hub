import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/assistant";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (id: string) => void;
}

export function ChatSidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const grouped = sessions.reduce<Record<string, ChatSession[]>>((acc, s) => {
    const d = new Date(s.created_at);
    let label = format(d, "MMM d, yyyy");
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    if (!acc[label]) acc[label] = [];
    acc[label].push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="w-64 border-r border-border bg-card/50 flex flex-col h-full">
        <div className="p-3 border-b border-border">
          <Button onClick={onNewSession} className="w-full" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">{label}</p>
                {items.map((s) => (
                  <div
                    key={s.session_id}
                    className={cn(
                      "group flex items-center gap-1 rounded hover:bg-accent transition-colors",
                      s.session_id === currentSessionId && "bg-accent text-accent-foreground"
                    )}
                  >
                    <button
                      onClick={() => onSelectSession(s.session_id)}
                      className="flex-1 text-left px-2 py-1.5 text-sm truncate min-w-0"
                    >
                      <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-50 flex-shrink-0" />
                      {s.title}
                    </button>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(s.session_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center pt-8">
                No conversations yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget && onDeleteSession) {
                  onDeleteSession(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
