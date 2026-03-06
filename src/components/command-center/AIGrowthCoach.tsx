import { useState, useRef, useEffect } from "react";
import { Brain, X, Send, Plus, Loader2, Sparkles, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/use-chat";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import { useGrowthForecast } from "@/hooks/use-growth-forecast";

const QUICK_PROMPTS = [
  "Why did my last video underperform?",
  "What should I publish next?",
  "Draft a sponsor pitch",
  "Analyze my growth rate",
] as const;

export function AIGrowthCoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    newSession,
  } = useChat();

  const { data: channelStats } = useChannelStats();
  const { data: forecast } = useGrowthForecast();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  function buildChannelContext(): string {
    if (!channelStats) return "";
    const parts = [
      `${channelStats.subscriber_count} subscribers`,
      `${channelStats.total_view_count} total views`,
      `${channelStats.video_count} videos`,
    ];
    if (forecast) {
      parts.push(
        `growth rate: ${forecast.dailyRate}/day`,
        `${forecast.onTrack ? "on track" : "behind"} for ${forecast.targetSubs} goal`
      );
    }
    return `[Channel Context: ${parts.join(", ")}] `;
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const channelContext = buildChannelContext();
    setInput("");
    await sendMessage(channelContext + content);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
          aria-label="Open AI Growth Coach"
        >
          <Brain className="w-5 h-5" />
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[400px] max-w-full bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">AI Growth Coach</h2>
            </div>
            <div className="flex items-center gap-1">
              {channelStats && (
                <Badge variant="secondary" className="text-xs mr-1">
                  {Number(channelStats.subscriber_count).toLocaleString()} subs
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => newSession()}
                aria-label="New session"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close coach"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Action Prompts */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center gap-2">
                <Brain className="w-10 h-10 opacity-30" />
                <p>Ask me anything about your channel growth, content strategy, or analytics.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {isUser
                      ? msg.content.replace(/^\[Channel Context:.*?\]\s*/, "")
                      : msg.content}
                  </div>
                  {isUser && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your growth coach..."
                disabled={isLoading}
                className="flex-1 bg-muted"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
