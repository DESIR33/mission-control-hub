import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, HelpCircleIcon, XIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { toast } from "sonner";
import { parseAiReplies } from "@/utils/clean-ai-reply";

interface InstantReplyBarProps {
  email: SmartEmail;
}

export function InstantReplyBar({ email }: InstantReplyBarProps) {
  const { workspaceId } = useWorkspace();
  const outlookSend = useOutlookSend();
  const [customReplies, setCustomReplies] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const quickReplies = [
    { icon: CheckIcon, label: "Got it, thanks!", body: "Got it, thanks!" },
    { icon: CheckIcon, label: "Sounds good", body: "Sounds good, let's proceed." },
    { icon: HelpCircleIcon, label: "Can you elaborate?", body: "Thanks for this. Could you elaborate a bit more on the details?" },
    { icon: XIcon, label: "Not interested", body: "Thank you for reaching out, but I'll have to pass on this." },
  ];

  const handleQuickReply = (body: string) => {
    outlookSend.mutate(
      { reply_to_message_id: email.message_id, body_html: body.replace(/\n/g, "<br>") },
      {
        onSuccess: () => toast.success("Reply sent"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  };

  const generateAiReplies = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `Generate 3 short reply options (each under 30 words) for this email. Return ONLY a JSON array of 3 strings, nothing else.\n\nFrom: ${email.from_name}\nSubject: ${email.subject}\nBody: ${email.body_html?.replace(/<[^>]*>/g, "").slice(0, 800) || email.preview}`,
          skip_tools: true,
        },
      });
      if (error) throw error;
      setCustomReplies(parseAiReplies(data?.response || ""));
    } catch {
      toast.error("Failed to generate replies");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t border-border px-4 py-3 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {quickReplies.map((qr) => (
          <Button
            key={qr.label}
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => handleQuickReply(qr.body)}
            disabled={outlookSend.isPending}
          >
            <qr.icon className="h-3 w-3" />
            {qr.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={generateAiReplies}
          disabled={generating}
        >
          {generating ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SparklesIcon className="h-3 w-3" />}
          AI Replies
        </Button>
      </div>

      {customReplies && (
        <div className="flex flex-wrap gap-1.5">
          {customReplies.map((reply, i) => (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              className="text-xs h-auto py-1.5 px-2.5 max-w-[200px] text-left whitespace-normal"
              onClick={() => handleQuickReply(reply)}
              disabled={outlookSend.isPending}
            >
              {reply}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
