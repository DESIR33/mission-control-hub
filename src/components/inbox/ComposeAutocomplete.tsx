import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";

interface ComposeAutocompleteProps {
  inputValue: string;
  cursorPosition: number;
  onAccept: (completion: string) => void;
}

export function ComposeAutocomplete({ inputValue, cursorPosition, onAccept }: ComposeAutocompleteProps) {
  const { workspaceId } = useWorkspace();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!inputValue || inputValue.length < 15 || !workspaceId) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("assistant-chat", {
          body: {
            workspace_id: workspaceId,
            session_id: "autocomplete",
            message: `Complete this email text naturally. Return ONLY the completion text (the part that comes after what's already written), nothing else. Keep it short (10-30 words max).\n\nText so far: "${inputValue.slice(-200)}"`,
            skip_tools: true,
          },
        });
        if (!error && data?.response) {
          const completion = data.response.trim();
          if (completion && completion.length > 3 && completion.length < 200) {
            setSuggestion(completion);
          }
        }
      } catch {
        // Silent fail
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [inputValue, workspaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && suggestion) {
        e.preventDefault();
        onAccept(suggestion);
        setSuggestion(null);
      } else if (e.key !== "Shift") {
        setSuggestion(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestion, onAccept]);

  if (!suggestion) return null;

  return (
    <span className="text-muted-foreground/40 pointer-events-none select-none text-sm">
      {suggestion}
    </span>
  );
}

// Hook version for easy integration
export function useComposeAutocomplete() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { workspaceId } = useWorkspace();

  const requestCompletion = useCallback(async (text: string) => {
    if (!text || text.length < 15 || !workspaceId) {
      setSuggestion(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: "autocomplete",
          message: `Complete this email text naturally. Return ONLY the completion text (the next 10-30 words), nothing else.\n\nText: "${text.slice(-200)}"`,
          skip_tools: true,
        },
      });
      if (!error && data?.response) {
        const completion = data.response.trim();
        if (completion.length > 3 && completion.length < 200) {
          setSuggestion(completion);
        }
      }
    } catch {
      setSuggestion(null);
    }
  }, [workspaceId]);

  const acceptSuggestion = useCallback(() => {
    const accepted = suggestion;
    setSuggestion(null);
    return accepted;
  }, [suggestion]);

  const clearSuggestion = useCallback(() => setSuggestion(null), []);

  return { suggestion, requestCompletion, acceptSuggestion, clearSuggestion };
}
