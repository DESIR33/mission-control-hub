import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, Building2, Handshake, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface Props {
  email: SmartEmail;
}

export function EmailToDealAutomation({ email }: Props) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("prospecting");

  const handleDetectAndCreate = async () => {
    if (!workspaceId) return;
    setIsCreating(true);
    try {
      // First, create or find the contact
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
            source: "email",
            status: "lead",
          })
          .select()
          .single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      // Create the deal
      const { error: dealErr } = await supabase
        .from("deals")
        .insert({
          workspace_id: workspaceId,
          title: dealTitle || `Deal from ${email.from_name || email.from_email}`,
          value: dealValue ? parseFloat(dealValue) : null,
          stage: dealStage,
          contact_id: contactId,
          notes: `Created from email: "${email.subject}"`,
        });
      if (dealErr) throw dealErr;

      toast.success("Contact and deal created from email!");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          setDealTitle(`Sponsorship - ${email.from_name || email.from_email}`);
          setShowDialog(true);
        }}
      >
        <Sparkles className="w-3.5 h-3.5 mr-2" />
        Create Deal from Email
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create Deal from Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {email.subject}</p>
              <p className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {email.from_name || email.from_email}</p>
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleDetectAndCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Handshake className="h-4 w-4 mr-2" />}
              Create Deal + Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
