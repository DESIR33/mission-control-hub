import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BellIcon, SparklesIcon, XIcon, Loader2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCreateFollowUp } from "@/hooks/use-email-follow-ups";
import { toast } from "sonner";

interface AutoReminderBannerProps {
  emailId: string;
  subject: string;
  bodyPreview: string;
  isSentEmail: boolean;
}

export function AutoReminderBanner({ emailId, subject, bodyPreview, isSentEmail }: AutoReminderBannerProps) {
  const { workspaceId } = useWorkspace();
  const createFollowUp = useCreateFollowUp();
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isSentEmail || !workspaceId || dismissed) return;

    let cancelled = false;
    const analyze = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("assistant-chat", {
          body: {
            workspace_id: workspaceId,
            session_id: crypto.randomUUID(),
            message: `Analyze this sent email. Does it contain a question, request, deadline, or expectation of a reply? If YES, respond with JSON: {"needs_follow_up": true, "reason": "brief reason", "days_to_wait": 2}. If NO, respond with JSON: {"needs_follow_up": false}.\n\nSubject: ${subject}\nBody: ${bodyPreview.slice(0, 500)}`,
            skip_tools: true,
          },
        });

        if (cancelled || error) return;

        try {
          const result = JSON.parse(data?.response || "{}");
          if (result.needs_follow_up) {
            setNeedsFollowUp(true);
            setSuggestedAction(result.reason || "Follow up on this email");
            const due = new Date(Date.now() + (result.days_to_wait || 2) * 24 * 60 * 60 * 1000);
            setDueDate(due.toISOString());
          }
        } catch {
          // Not valid JSON, ignore
        }
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    analyze();
    return () => { cancelled = true; };
  }, [emailId, isSentEmail, workspaceId, dismissed]);

  if (dismissed || !needsFollowUp || loading) return null;

  const handleSetReminder = () => {
    createFollowUp.mutate({
      email_id: emailId,
      reason: "auto_reminder",
      priority: "medium",
      suggested_action: suggestedAction,
      due_date: dueDate,
    }, {
      onSuccess: () => {
        toast.success("Follow-up reminder set");
        setDismissed(true);
      },
    });
  };

  return (
    <div className="border-t border-border px-4 py-2 bg-amber-500/5 flex items-center gap-2">
      <SparklesIcon className="h-3 w-3 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700 flex-1">
        <strong>Auto Reminder:</strong> {suggestedAction}
      </p>
      <Button size="sm" variant="outline" className="text-xs h-6 gap-1" onClick={handleSetReminder}>
        <BellIcon className="h-3 w-3" />
        Set Reminder
      </Button>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setDismissed(true)}>
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}
