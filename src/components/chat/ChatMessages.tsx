import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Brain, User, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/assistant";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground pt-20">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">AI Assistant</p>
            <p className="text-sm mt-1">
              Your persistent business partner with full memory across YouTube, CRM, and email.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={cn("flex gap-3", msg.role === "user" && "justify-end")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "rounded-lg px-4 py-3 max-w-[85%] text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border border-border"
              )}
            >
              {msg.role === "assistant" ? (
                <>
                  <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {msg.metadata &&
                    (msg.metadata.memories_used !== undefined &&
                      msg.metadata.memories_used > 0 ||
                      (msg.metadata.tools_called?.length ?? 0) > 0) && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        {msg.metadata.memories_used !== undefined &&
                          msg.metadata.memories_used > 0 && (
                            <span>🧠 {msg.metadata.memories_used} memories</span>
                          )}
                        {(msg.metadata.tools_called?.length ?? 0) > 0 && (
                          <span>
                            🔧 {msg.metadata.tools_called!.length} tools
                          </span>
                        )}
                        {msg.metadata.agent_delegated && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                            <Bot className="h-2.5 w-2.5" />
                            Agent
                          </Badge>
                        )}
                      </div>
                    )}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-md bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
