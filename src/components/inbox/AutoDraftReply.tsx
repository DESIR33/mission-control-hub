import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SparklesIcon, Loader2Icon, SendIcon, EditIcon, XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { toast } from "sonner";
import { cleanAiReply } from "@/utils/clean-ai-reply";

interface AutoDraftReplyProps {
  email: SmartEmail;
}

export function AutoDraftReply({ email }: AutoDraftReplyProps) {
  const { workspaceId } = useWorkspace();
  const outlookSend = useOutlookSend();
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);

  // Auto-generate draft when email is viewed
  useEffect(() => {
    if (!workspaceId || !email.body_html || dismissed) return;
    
    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      try {
        const contactContext = email.matched_contact
          ? `\nCRM Contact: ${email.matched_contact.first_name} ${email.matched_contact.last_name || ""} (Tier: ${email.matched_contact.tier || "none"})`
          : "";
        const dealContext = email.matched_deal
          ? `\nActive Deal: ${email.matched_deal.title} (${email.matched_deal.stage}, $${email.matched_deal.value || 0})`
          : "";

        const { data, error } = await supabase.functions.invoke("assistant-chat", {
          body: {
            workspace_id: workspaceId,
            session_id: crypto.randomUUID(),
            message: `Draft a professional reply to this email. Be concise (under 100 words), warm, and action-oriented. Use context from the CRM data if available.${contactContext}${dealContext}\n\nFrom: ${email.from_name}\nSubject: ${email.subject}\nBody: ${email.body_html?.replace(/<[^>]*>/g, "").slice(0, 1000) || email.preview}\n\nReturn ONLY the reply text, no greeting prefix like "Here's a draft". Start directly with the reply content.`,
            skip_tools: true,
          },
        });
        if (!cancelled && !error && data?.response) {
          const cleaned = cleanAiReply(data.response);
          setDraft(cleaned);
          setEditedDraft(cleaned);
        }
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [email.id, workspaceId, dismissed]);

  if (dismissed) return null;

  if (loading) {
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="h-3 w-3 animate-spin" />
          <SparklesIcon className="h-3 w-3 text-primary" />
          Drafting reply...
        </div>
      </div>
    );
  }

  if (!draft) return null;

  const handleSend = () => {
    const body = editing ? editedDraft : draft;
    outlookSend.mutate(
      { reply_to_message_id: email.message_id, body_html: body.replace(/\n/g, "<br>") },
      {
        onSuccess: () => {
          toast.success("Reply sent");
          setDismissed(true);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="border-t border-border px-4 py-3 bg-primary/[0.02] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <SparklesIcon className="h-3 w-3 text-primary" />
          AI Draft Reply
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(!editing)}>
            <EditIcon className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDismissed(true)}>
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {editing ? (
        <Textarea
          value={editedDraft}
          onChange={(e) => setEditedDraft(e.target.value)}
          rows={4}
          className="text-xs"
        />
      ) : (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-card rounded-md p-2 border border-border">
          {draft}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" className="text-xs gap-1.5" onClick={handleSend} disabled={outlookSend.isPending}>
          {outlookSend.isPending ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SendIcon className="h-3 w-3" />}
          Send Reply
        </Button>
        {!editing && (
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditing(true)}>
            Edit first
          </Button>
        )}
      </div>
    </div>
  );
}
