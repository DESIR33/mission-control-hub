import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { cn } from "@/lib/utils";

interface AutoSummaryBannerProps {
  email: SmartEmail;
}

export function AutoSummaryBanner({ email }: AutoSummaryBannerProps) {
  const { workspaceId } = useWorkspace();
  const [summary, setSummary] = useState<string | null>((email as any).ai_summary ?? null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-summarize if no cached summary exists
  useEffect(() => {
    if (summary || !workspaceId || !email.body_html) return;
    
    let cancelled = false;
    const summarize = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("assistant-chat", {
          body: {
            workspace_id: workspaceId,
            session_id: crypto.randomUUID(),
            message: `Summarize this email in exactly 1 concise sentence (max 20 words), then provide 3 bullet points with key details. Format: First line is the 1-line summary, then bullet points on new lines.\n\nSubject: ${email.subject}\nFrom: ${email.from_name}\n\n${email.body_html?.replace(/<[^>]*>/g, "").slice(0, 1500) || email.preview}`,
            skip_tools: true,
          },
        });
        if (!cancelled && !error && data?.response) {
          setSummary(data.response);
          // Cache summary in DB
          await supabase
            .from("inbox_emails" as any)
            .update({ ai_summary: data.response } as any)
            .eq("id", email.id);
        }
      } catch {
        // Silent fail for auto-summary
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    summarize();
    return () => { cancelled = true; };
  }, [email.id, summary, workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border text-xs text-muted-foreground">
        <Loader2Icon className="h-3 w-3 animate-spin" />
        Summarizing...
      </div>
    );
  }

  if (!summary) return null;

  const lines = summary.split("\n").filter(Boolean);
  const oneLiner = lines[0] || summary;
  const details = lines.slice(1);

  return (
    <div className="bg-primary/5 border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-primary/10 transition-colors"
      >
        <SparklesIcon className="h-3 w-3 text-primary shrink-0" />
        <span className="text-xs text-foreground truncate flex-1">{oneLiner}</span>
        {details.length > 0 && (
          expanded
            ? <ChevronUpIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronDownIcon className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && details.length > 0 && (
        <div className="px-4 pb-2 space-y-0.5">
          {details.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-5">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
