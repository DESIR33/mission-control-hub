import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface SmartReplySuggestionsProps {
  email: SmartEmail | null;
  onSendReply: (body: string) => void;
  isSending: boolean;
}

export function SmartReplySuggestions({ email, onSendReply, isSending }: SmartReplySuggestionsProps) {
  const { workspaceId } = useWorkspace();
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReplies = async () => {
    if (!email || !workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `Generate exactly 3 reply options for this email. Format as JSON array of strings. Keep each under 100 words. Options should be: 1) Accept/positive, 2) Negotiate/ask questions, 3) Politely decline.\n\nFrom: ${email.from_name}\nSubject: ${email.subject}\nBody: ${email.body_html?.replace(/<[^>]*>/g, "").slice(0, 500) || email.preview}`,
          skip_tools: true,
        },
      });
      if (error) throw error;
      try {
        const parsed = JSON.parse(data?.response || "[]");
        setReplies(Array.isArray(parsed) ? parsed : [data?.response || "No suggestions"]);
      } catch {
        setReplies([data?.response || "No suggestions"]);
      }
    } catch {
      setReplies(["Failed to generate suggestions."]);
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Smart Replies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {replies.length === 0 ? (
          <Button size="sm" variant="outline" onClick={generateReplies} disabled={loading} className="w-full text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Generate Reply Options
          </Button>
        ) : (
          replies.map((reply, i) => (
            <div key={i} className="rounded-md border border-border p-2 space-y-1.5">
              <p className="text-xs text-foreground">{reply}</p>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => onSendReply(reply.replace(/\n/g, "<br>"))} disabled={isSending}>
                <Send className="h-3 w-3 mr-1" /> Use This Reply
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
