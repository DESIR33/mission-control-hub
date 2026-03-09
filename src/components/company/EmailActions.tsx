import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCreateVideo } from "@/hooks/use-video-queue";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Handshake, Lightbulb, Loader2 } from "lucide-react";
import type { InboxEmail } from "@/hooks/use-smart-inbox";

interface EmailActionsProps {
  email: InboxEmail;
  companyId: string;
  companyName: string;
  companyLogo?: string | null;
}

export function EmailActions({ email, companyId, companyName, companyLogo }: EmailActionsProps) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const createVideo = useCreateVideo();

  const [dealOpen, setDealOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // Deal form state
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("prospecting");

  // Video form state
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoPriority, setVideoPriority] = useState<"low" | "medium" | "high">("medium");

  const openDealDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDealTitle(`Sponsorship - ${companyName}`);
    setDealOpen(true);
  };

  const openVideoDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoTitle(`Video idea from ${email.from_name || email.from_email}`);
    setVideoDescription(`From email: "${email.subject}"\n\n${email.preview}`);
    setVideoOpen(true);
  };

  const handleCreateDeal = async () => {
    if (!workspaceId) return;
    setIsCreatingDeal(true);
    try {
      // Find or create contact
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", email.from_email)
        .maybeSingle();

      let contactId = existingContact?.id;

      if (!contactId) {
        const nameParts = (email.from_name || "").split(" ");
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            workspace_id: workspaceId,
            first_name: nameParts[0] || email.from_email.split("@")[0],
            last_name: nameParts.slice(1).join(" ") || null,
            email: email.from_email,
            company_id: companyId,
            source: "email",
            status: "lead",
          })
          .select()
          .single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      const { error: dealErr } = await supabase.from("deals").insert({
        workspace_id: workspaceId,
        title: dealTitle || `Deal from ${email.from_name || email.from_email}`,
        value: dealValue ? parseFloat(dealValue) : null,
        stage: dealStage,
        contact_id: contactId,
        company_id: companyId,
        notes: `Created from email: "${email.subject}"`,
      });
      if (dealErr) throw dealErr;

      toast.success("Deal created from email!");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      setDealOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingDeal(false);
    }
  };

  const handleCreateVideo = async () => {
    try {
      await createVideo.mutateAsync({
        title: videoTitle || `Video idea from ${email.from_name || email.from_email}`,
        description: videoDescription || undefined,
        status: "idea",
        priority: videoPriority,
        isSponsored: true,
        companyId,
        companyName,
        companyLogo,
      });
      toast.success("Video idea added to pipeline!");
      setVideoOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openDealDialog} title="Create Deal">
          <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openVideoDialog} title="Add Video Idea">
          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="sm:max-w-[420px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-primary" /> Create Deal from Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium truncate">{email.subject}</p>
              <p className="text-muted-foreground">From: {email.from_name || email.from_email}</p>
            </div>
            <div>
              <Label>Deal Title</Label>
              <Input value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
            </div>
            <div>
              <Label>Estimated Value ($)</Label>
              <Input type="number" value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={dealStage} onValueChange={setDealStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDeal} disabled={isCreatingDeal}>
              {isCreatingDeal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Handshake className="h-4 w-4 mr-2" />}
              Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Video Idea Dialog */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="sm:max-w-[420px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Add Video Idea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium truncate">{email.subject}</p>
              <p className="text-muted-foreground">From: {email.from_name || email.from_email}</p>
            </div>
            <div>
              <Label>Video Title</Label>
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={videoPriority} onValueChange={(v) => setVideoPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateVideo} disabled={createVideo.isPending}>
              {createVideo.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              Add to Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
