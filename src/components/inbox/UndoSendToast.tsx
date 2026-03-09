import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { XIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UndoSendToastProps {
  visible: boolean;
  undoWindowMs?: number;
  onUndo: () => void;
  onExpire: () => void;
}

export function UndoSendToast({ visible, undoWindowMs = 7000, onUndo, onExpire }: UndoSendToastProps) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      setProgress(100);
      return;
    }

    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / undoWindowMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [visible, undoWindowMs, onExpire]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-lg shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[280px] animate-in slide-in-from-bottom-4">
      <div className="flex-1">
        <p className="text-sm font-medium">Sending email...</p>
        <div className="mt-1.5 h-1 w-full bg-background/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 text-xs font-semibold"
        onClick={onUndo}
      >
        Undo
      </Button>
    </div>
  );
}
