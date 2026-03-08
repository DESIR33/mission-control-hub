import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Trash2, Pencil, Pin, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/assistant";
import { format, isToday, isYesterday } from "date-fns";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { toast } from "sonner";

interface Props {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (id: string) => void;
  onRenameSession?: (id: string, title: string) => void;
}

export function ChatSidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession, onRenameSession }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameTarget && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameTarget]);

  const handleRenameSubmit = (sid: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameSession) {
      onRenameSession(sid, trimmed);
    }
    setRenameTarget(null);
  };

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success("Copied to clipboard");
  };

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
                  <ContextMenu key={s.session_id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "group flex items-center gap-1 rounded hover:bg-accent transition-colors",
                          s.session_id === currentSessionId && "bg-accent text-accent-foreground"
                        )}
                      >
                        {renameTarget === s.session_id ? (
                          <form
                            className="flex-1 px-1 py-0.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRenameSubmit(s.session_id);
                            }}
                          >
                            <Input
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRenameSubmit(s.session_id)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setRenameTarget(null);
                              }}
                              className="h-7 text-sm px-1.5 border-primary"
                            />
                          </form>
                        ) : (
                          <button
                            onClick={() => onSelectSession(s.session_id)}
                            className="flex-1 text-left px-2 py-1.5 text-sm truncate min-w-0"
                          >
                            <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-50 flex-shrink-0" />
                            {s.title}
                          </button>
                        )}
                        {onDeleteSession && renameTarget !== s.session_id && (
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
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      {onRenameSession && (
                        <ContextMenuItem
                          onClick={() => {
                            setRenameTarget(s.session_id);
                            setRenameValue(s.title);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Rename
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem onClick={() => handleCopyTitle(s.title)}>
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copy title
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => onSelectSession(s.session_id)}>
                        <Pin className="h-3.5 w-3.5 mr-2" />
                        Open conversation
                      </ContextMenuItem>
                      {onDeleteSession && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(s.session_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
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
