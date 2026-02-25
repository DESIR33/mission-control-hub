import { useEffect } from "react";

interface UseInboxShortcutsOptions {
  enabled: boolean;
  onDelete: () => void;
  onArchive: () => void;
  onReply: () => void;
  onMarkUnread: () => void;
  onNextMessage: () => void;
  onPreviousMessage: () => void;
  onToggleHelp: () => void;
}

export function useInboxShortcuts(options: UseInboxShortcutsOptions) {
  const {
    enabled,
    onDelete,
    onArchive,
    onReply,
    onMarkUnread,
    onNextMessage,
    onPreviousMessage,
    onToggleHelp,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case "Delete":
        case "Backspace":
          event.preventDefault();
          onDelete();
          break;
        case "e":
        case "E":
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onArchive();
          }
          break;
        case "r":
        case "R":
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onReply();
          }
          break;
        case "u":
        case "U":
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onMarkUnread();
          }
          break;
        case "j":
        case "J":
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onNextMessage();
          }
          break;
        case "k":
        case "K":
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onPreviousMessage();
          }
          break;
        case "?":
          event.preventDefault();
          onToggleHelp();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onDelete, onArchive, onReply, onMarkUnread, onNextMessage, onPreviousMessage, onToggleHelp]);
}
