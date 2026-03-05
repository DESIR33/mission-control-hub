import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/assistant";
import { format, isToday, isYesterday } from "date-fns";

interface Props {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export function ChatSidebar({ sessions, currentSessionId, onSelectSession, onNewSession }: Props) {
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
                <button
                  key={s.session_id}
                  onClick={() => onSelectSession(s.session_id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-sm truncate hover:bg-accent transition-colors",
                    s.session_id === currentSessionId && "bg-accent text-accent-foreground"
                  )}
                >
                  <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-50" />
                  {s.title}
                </button>
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
  );
}
