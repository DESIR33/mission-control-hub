import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { QuoteIcon } from "lucide-react";

interface QuickQuoteReplyProps {
  onQuote: (quotedText: string) => void;
}

export function QuickQuoteReply({ onQuote }: QuickQuoteReplyProps) {
  const [selectedText, setSelectedText] = useState("");
  const [showButton, setShowButton] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (text.length > 5) {
      setSelectedText(text);
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      }
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  if (!showButton) return null;

  return (
    <div
      className="fixed z-50 animate-in fade-in-0 zoom-in-95"
      style={{ left: position.x - 50, top: position.y - 36 }}
    >
      <Button
        size="sm"
        variant="secondary"
        className="text-xs gap-1.5 shadow-lg"
        onClick={() => {
          onQuote(selectedText);
          setShowButton(false);
        }}
      >
        <QuoteIcon className="h-3 w-3" />
        Quote Reply
      </Button>
    </div>
  );
}
