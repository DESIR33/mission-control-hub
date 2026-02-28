import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillTo?: string;
  prefillSubject?: string;
  prefillBody?: string;
  contactId?: string;
  dealId?: string;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  prefillTo = "",
  prefillSubject = "",
  prefillBody = "",
  contactId,
  dealId,
}: ComposeEmailDialogProps) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [to, setTo] = useState(prefillTo);
  const [subject, setSubject] = useState(prefillSubject);
  const [body, setBody] = useState(prefillBody);

  // Reset form when dialog opens with new prefills
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTo(prefillTo);
      setSubject(prefillSubject);
      setBody(prefillBody);
    }
    onOpenChange(newOpen);
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      toast({ title: "To and Subject are required", variant: "destructive" });
      return;
    }

    if (!workspaceId) {
      toast({ title: "Workspace not found", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          workspace_id: workspaceId,
          to: to.trim(),
          subject: subject.trim(),
          body_html: body.replace(/\n/g, "<br>"),
          contact_id: contactId || undefined,
          deal_id: dealId || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Email sent successfully" });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to send email",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Compose Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="email-to">To *</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject *</Label>
            <Input
              id="email-subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              placeholder="Write your email..."
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
