import { useEffect, useCallback } from "react";

export function useTaskKeyboardShortcuts() {
  const focusQuickAdd = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-quick-add="true"]'
    );
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        focusQuickAdd();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusQuickAdd]);
}
