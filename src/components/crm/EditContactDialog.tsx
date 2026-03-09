import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateContact } from "@/hooks/use-contacts";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { Contact } from "@/types/crm";

interface EditContactDialogProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditContactDialog({ contact, open, onOpenChange }: EditContactDialogProps) {
  const updateContact = useUpdateContact();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    website: "",
    status: "lead",
    vip_tier: "none",
    preferred_channel: "email",
    response_sla_minutes: "",
    notes: "",
    social_twitter: "",
    social_linkedin: "",
    social_youtube: "",
    social_instagram: "",
    social_facebook: "",
    social_telegram: "",
    social_whatsapp: "",
  });

  useEffect(() => {
    if (contact && open) {
      setForm({
        first_name: contact.first_name ?? "",
        last_name: contact.last_name ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        role: contact.role ?? "",
        website: contact.website ?? "",
        status: contact.status ?? "lead",
        vip_tier: contact.vip_tier ?? "none",
        preferred_channel: contact.preferred_channel ?? "email",
        response_sla_minutes: contact.response_sla_minutes?.toString() ?? "",
        notes: contact.notes ?? "",
        social_twitter: contact.social_twitter ?? "",
        social_linkedin: contact.social_linkedin ?? "",
        social_youtube: contact.social_youtube ?? "",
        social_instagram: contact.social_instagram ?? "",
        social_facebook: contact.social_facebook ?? "",
        social_telegram: contact.social_telegram ?? "",
        social_whatsapp: contact.social_whatsapp ?? "",
      });
    }
  }, [contact, open]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) {
      toast.error("First name is required");
      return;
    }
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role || undefined,
        website: form.website || undefined,
        status: form.status,
        vip_tier: form.vip_tier,
        preferred_channel: form.preferred_channel,
        response_sla_minutes: form.response_sla_minutes ? Number(form.response_sla_minutes) : null,
        notes: form.notes || undefined,
        social_twitter: form.social_twitter || undefined,
        social_linkedin: form.social_linkedin || undefined,
        social_youtube: form.social_youtube || undefined,
        social_instagram: form.social_instagram || undefined,
        social_facebook: form.social_facebook || undefined,
        social_telegram: form.social_telegram || undefined,
        social_whatsapp: form.social_whatsapp || undefined,
      });
      toast.success("Contact updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => set("role", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
          </div>

          {/* Status & VIP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>VIP Tier</Label>
              <Select value={form.vip_tier} onValueChange={(v) => set("vip_tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.preferred_channel} onValueChange={(v) => set("preferred_channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Response SLA (minutes)</Label>
            <Input type="number" value={form.response_sla_minutes} onChange={(e) => set("response_sla_minutes", e.target.value)} />
          </div>

          {/* Socials */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Social Profiles</Label>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["social_twitter", "Twitter / X"],
                ["social_linkedin", "LinkedIn"],
                ["social_youtube", "YouTube"],
                ["social_instagram", "Instagram"],
                ["social_facebook", "Facebook"],
                ["social_telegram", "Telegram"],
                ["social_whatsapp", "WhatsApp"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={(form as any)[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateContact.isPending}>
            {updateContact.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
