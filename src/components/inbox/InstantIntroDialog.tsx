import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UsersIcon, Loader2Icon, SendIcon, SparklesIcon } from "lucide-react";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface InstantIntroDialogProps {
  email: SmartEmail | null;
}

export function InstantIntroDialog({ email }: InstantIntroDialogProps) {
  const { workspaceId } = useWorkspace();
  const outlookSend = useOutlookSend();
  const [open, setOpen] = useState(false);
  const [introTo, setIntroTo] = useState("");
  const [introName, setIntroName] = useState("");
  const [introBody, setIntroBody] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateIntro = async () => {
    if (!workspaceId || !email) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `Write a professional double-opt-in email introduction between ${email.from_name || email.from_email} and ${introName || introTo}. Keep it warm, concise, under 80 words. Include context from their email: "${email.subject}". Format as plain text ready to send.`,
          skip_tools: true,
        },
      });
      if (error) throw error;
      setIntroBody(data?.response || "");
    } catch {
      toast.error("Failed to generate intro");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = () => {
    if (!introTo.trim() || !introBody.trim()) {
      toast.error("Fill in recipient and message");
      return;
    }
    outlookSend.mutate(
      {
        to: `${introTo}, ${email?.from_email}`,
        subject: `Introduction: ${email?.from_name || email?.from_email} ↔ ${introName || introTo}`,
        body_html: introBody.replace(/\n/g, "<br>"),
      },
      {
        onSuccess: () => {
          toast.success("Introduction sent!");
          setOpen(false);
          setIntroTo("");
          setIntroName("");
          setIntroBody("");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  if (!email) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Introduce">
        <UsersIcon className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Instant Intro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Introduce <strong>{email.from_name || email.from_email}</strong> to someone
            </p>
            <div>
              <Label>Introduce to (email) *</Label>
              <Input value={introTo} onChange={(e) => setIntroTo(e.target.value)} placeholder="person@example.com" />
            </div>
            <div>
              <Label>Their name</Label>
              <Input value={introName} onChange={(e) => setIntroName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={generateIntro} disabled={generating} className="gap-1.5">
                {generating ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SparklesIcon className="h-3 w-3" />}
                AI Generate Intro
              </Button>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={introBody} onChange={(e) => setIntroBody(e.target.value)} rows={6} placeholder="Write your introduction..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={outlookSend.isPending}>
              {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Send Introduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
