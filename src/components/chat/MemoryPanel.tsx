import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const originIcons: Record<string, string> = {
  youtube: "🎥",
  crm: "👤",
  email: "📧",
  strategy: "🎯",
  preference: "⚙️",
  manual: "📝",
};

interface Props {
  memoriesUsed: any[];
  toolsCalled: string[];
  onClose?: () => void;
}

export function MemoryPanel({ memoriesUsed, toolsCalled, onClose }: Props) {
  return (
    <div className="w-80 border-l border-border bg-card/50 flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Context Used</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 p-3">
        {memoriesUsed.length === 0 && toolsCalled.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-8">
            Memory context will appear here after your first message.
          </p>
        ) : (
          <div className="space-y-3">
            {memoriesUsed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Memories Retrieved
                </p>
                <div className="space-y-2">
                  {memoriesUsed.map((m: any, i: number) => (
                    <div
                      key={i}
                      className="p-2 rounded border border-border bg-muted/30 text-xs"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span>{originIcons[m.origin] || "📝"}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {m.origin}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-3">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {toolsCalled.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Tools Called
                </p>
                <div className="flex flex-wrap gap-1">
                  {toolsCalled.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
