import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Sparkles, Send, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  emailSubject?: string;
  emailBody?: string;
  senderName?: string;
  senderEmail?: string;
  contactId?: string;
}

export function SmartReplyComposer({ emailSubject, emailBody, senderName, senderEmail, contactId }: Props) {
  const { workspaceId } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReply = async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          messages: [
            {
              role: "user",
              content: `Generate a professional email reply. Context:
- Subject: ${emailSubject || "N/A"}
- From: ${senderName || "Unknown"} (${senderEmail || ""})
- Original email snippet: ${emailBody?.slice(0, 500) || "N/A"}

Write a concise, professional reply that addresses the email. Be friendly but direct. Use the contact's first name if available.`,
            },
          ],
          model: "minimax/minimax-m2.5",
        },
      });
      if (error) throw error;
      setDraft(data?.response || data?.content || "");
    } catch (err: any) {
      toast.error("Failed to generate reply: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Reply copied to clipboard");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Smart Reply
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!draft ? (
          <Button
            onClick={generateReply}
            disabled={isGenerating}
            variant="outline"
            className="w-full gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGenerating ? "Generating with CRM context..." : "Generate AI Reply"}
          </Button>
        ) : (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" onClick={generateReply} disabled={isGenerating} variant="ghost" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
