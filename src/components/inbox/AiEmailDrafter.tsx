import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Send, User, Handshake, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface Props {
  email: SmartEmail;
  onSendDraft: (body: string) => void;
  isSending?: boolean;
}

export function AiEmailDrafter({ email, onSendDraft, isSending }: Props) {
  const { workspaceId } = useWorkspace();
  const [showDraft, setShowDraft] = useState(false);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    try {
      // Gather CRM context
      const contextParts: string[] = [];

      if (email.matched_contact) {
        contextParts.push(`Contact: ${email.matched_contact.first_name} ${email.matched_contact.last_name ?? ""}`);
        if (email.matched_contact.tier && email.matched_contact.tier !== "none") {
          contextParts.push(`VIP Tier: ${email.matched_contact.tier}`);
        }
      }

      if (email.matched_deal) {
        contextParts.push(`Active Deal: "${email.matched_deal.title}" - Stage: ${email.matched_deal.stage}, Value: $${email.matched_deal.value?.toLocaleString() ?? "N/A"}`);
      }

      const crmContext = contextParts.length > 0 
        ? `CRM Context:\n${contextParts.join("\n")}\n\n` 
        : "";

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          messages: [
            {
              role: "user",
              content: `Draft a professional reply to this email. Be concise and friendly.\n\n${crmContext}Original email from ${email.from_name || email.from_email}:\nSubject: ${email.subject}\n\n${email.preview || ""}`,
            },
          ],
        },
      });

      if (error) throw error;
      const response = data?.response || data?.content || "Unable to generate draft. Please try again.";
      setDraft(response);
      setShowDraft(true);
    } catch (err: any) {
      toast.error(`Draft generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        AI Draft
      </Button>

      <Dialog open={showDraft} onOpenChange={setShowDraft}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Generated Reply
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* CRM Context Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {email.matched_contact && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <User className="h-3 w-3" />
                  {email.matched_contact.first_name} {email.matched_contact.last_name}
                </Badge>
              )}
              {email.matched_deal && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Handshake className="h-3 w-3" />
                  {email.matched_deal.title} ({email.matched_deal.stage})
                </Badge>
              )}
              {!email.matched_contact && !email.matched_deal && (
                <Badge variant="outline" className="text-xs text-muted-foreground">No CRM context available</Badge>
              )}
            </div>

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDraft(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regenerate
            </Button>
            <Button onClick={() => { onSendDraft(draft); setShowDraft(false); }} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
