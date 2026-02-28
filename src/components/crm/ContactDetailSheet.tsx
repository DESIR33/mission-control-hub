import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActivityTimeline } from "./ActivityTimeline";
import { useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Globe, Linkedin, Twitter, Instagram, MessageSquare, Building2, Clock, Shield, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, Activity } from "@/types/crm";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const tierLabels: Record<string, { label: string; color: string }> = {
  none: { label: "\u2014", color: "" },
  silver: { label: "\uD83E\uDD48 Silver", color: "text-muted-foreground" },
  gold: { label: "\uD83E\uDD47 Gold", color: "text-warning" },
  platinum: { label: "\uD83D\uDC8E Platinum", color: "text-primary" },
};

interface ContactDetailSheetProps {
  contact: Contact | null;
  activities: Activity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

export function ContactDetailSheet({ contact, activities, open, onOpenChange, onDeleted }: ContactDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState("active");
  const [vipTier, setVipTier] = useState("none");
  const [preferredChannel, setPreferredChannel] = useState("email");

  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { toast } = useToast();

  useEffect(() => {
    if (contact) {
      setStatus(contact.status);
      setVipTier(contact.vip_tier);
      setPreferredChannel(contact.preferred_channel);
    }
  }, [contact]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!contact) return null;

  const tier = tierLabels[contact.vip_tier];

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await updateContact.mutateAsync({
        id: contact.id,
        first_name: form.get("first_name") as string,
        last_name: (form.get("last_name") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        role: (form.get("role") as string) || undefined,
        website: (form.get("website") as string) || undefined,
        status,
        vip_tier: vipTier,
        preferred_channel: preferredChannel,
        response_sla_minutes: form.get("response_sla_minutes") ? Number(form.get("response_sla_minutes")) : null,
        social_twitter: (form.get("social_twitter") as string) || undefined,
        social_linkedin: (form.get("social_linkedin") as string) || undefined,
        social_facebook: (form.get("social_facebook") as string) || undefined,
        social_instagram: (form.get("social_instagram") as string) || undefined,
        social_telegram: (form.get("social_telegram") as string) || undefined,
        social_whatsapp: (form.get("social_whatsapp") as string) || undefined,
        social_discord: (form.get("social_discord") as string) || undefined,
        social_youtube: (form.get("social_youtube") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Contact updated" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contact.id);
      toast({ title: "Contact deleted" });
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-foreground text-lg">
                  {contact.first_name} {contact.last_name}
                </SheetTitle>
                {contact.role && (
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", statusColors[contact.status])}>
                {contact.status}
              </Badge>
              {contact.vip_tier !== "none" && (
                <span className={cn("text-xs", tier.color)}>{tier.label}</span>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="enrichment" className="flex-1">Enrichment</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_first_name">First Name *</Label>
                      <Input id="edit_first_name" name="first_name" required defaultValue={contact.first_name} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_last_name">Last Name</Label>
                      <Input id="edit_last_name" name="last_name" defaultValue={contact.last_name ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_email">Email</Label>
                      <Input id="edit_email" name="email" type="email" defaultValue={contact.email ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_phone">Phone</Label>
                      <Input id="edit_phone" name="phone" defaultValue={contact.phone ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_role">Role</Label>
                      <Input id="edit_role" name="role" defaultValue={contact.role ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_website">Website</Label>
                      <Input id="edit_website" name="website" defaultValue={contact.website ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>

                  {/* Status & VIP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
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
                      <Select value={vipTier} onValueChange={setVipTier}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="silver">{"\uD83E\uDD48"} Silver</SelectItem>
                          <SelectItem value="gold">{"\uD83E\uDD47"} Gold</SelectItem>
                          <SelectItem value="platinum">{"\uD83D\uDC8E"} Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* SLA & Channel */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_sla">Response SLA (min)</Label>
                      <Input id="edit_sla" name="response_sla_minutes" type="number" defaultValue={contact.response_sla_minutes ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preferred Channel</Label>
                      <Select value={preferredChannel} onValueChange={setPreferredChannel}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="slack">Slack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Social */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_twitter">Twitter / X</Label>
                      <Input id="edit_twitter" name="social_twitter" defaultValue={contact.social_twitter ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_linkedin">LinkedIn</Label>
                      <Input id="edit_linkedin" name="social_linkedin" defaultValue={contact.social_linkedin ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_facebook">Facebook</Label>
                      <Input id="edit_facebook" name="social_facebook" defaultValue={contact.social_facebook ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_instagram">Instagram</Label>
                      <Input id="edit_instagram" name="social_instagram" defaultValue={contact.social_instagram ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_telegram">Telegram</Label>
                      <Input id="edit_telegram" name="social_telegram" defaultValue={contact.social_telegram ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_whatsapp">WhatsApp</Label>
                      <Input id="edit_whatsapp" name="social_whatsapp" defaultValue={contact.social_whatsapp ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_discord">Discord</Label>
                      <Input id="edit_discord" name="social_discord" defaultValue={contact.social_discord ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_youtube">YouTube</Label>
                      <Input id="edit_youtube" name="social_youtube" defaultValue={contact.social_youtube ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_notes">Notes</Label>
                    <Textarea id="edit_notes" name="notes" rows={3} defaultValue={contact.notes ?? ""} className="bg-secondary border-border" />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateContact.isPending}>
                      {updateContact.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Contact Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                      <DetailRow icon={Phone} label="Phone" value={contact.phone} />
                      <DetailRow icon={Globe} label="Website" value={contact.website} href={contact.website ?? undefined} />
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Company */}
                  {contact.company && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company</h4>
                        <div className="space-y-0.5">
                          <DetailRow icon={Building2} label="Company" value={contact.company.name} />
                          <DetailRow icon={Globe} label="Industry" value={contact.company.industry} />
                          <DetailRow icon={Globe} label="Website" value={contact.company.website} href={contact.company.website ?? undefined} />
                        </div>
                      </div>
                      <Separator className="bg-border" />
                    </>
                  )}

                  {/* Social */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={Twitter} label="Twitter / X" value={contact.social_twitter} href={contact.social_twitter ? `https://x.com/${contact.social_twitter.replace("@", "")}` : undefined} />
                      <DetailRow icon={Linkedin} label="LinkedIn" value={contact.social_linkedin} href={contact.social_linkedin ? `https://linkedin.com/in/${contact.social_linkedin}` : undefined} />
                      <DetailRow icon={Globe} label="Facebook" value={contact.social_facebook} href={contact.social_facebook ? `https://facebook.com/${contact.social_facebook}` : undefined} />
                      <DetailRow icon={Instagram} label="Instagram" value={contact.social_instagram} href={contact.social_instagram ? `https://instagram.com/${contact.social_instagram.replace("@", "")}` : undefined} />
                      <DetailRow icon={MessageSquare} label="Telegram" value={contact.social_telegram} href={contact.social_telegram ? `https://t.me/${contact.social_telegram.replace("@", "")}` : undefined} />
                      <DetailRow icon={MessageSquare} label="WhatsApp" value={contact.social_whatsapp} />
                      <DetailRow icon={MessageSquare} label="Discord" value={contact.social_discord} />
                      <DetailRow icon={Globe} label="YouTube" value={contact.social_youtube} href={contact.social_youtube ? `https://youtube.com/${contact.social_youtube}` : undefined} />
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* SLA & Preferences */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">SLA & Preferences</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={Clock} label="Response SLA" value={contact.response_sla_minutes ? `${contact.response_sla_minutes} min` : null} />
                      <DetailRow icon={Shield} label="Preferred Channel" value={contact.preferred_channel} />
                    </div>
                  </div>

                  {/* Notes */}
                  {contact.notes && (
                    <>
                      <Separator className="bg-border" />
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Meta */}
                  <Separator className="bg-border" />
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Created: {format(new Date(contact.created_at), "MMM d, yyyy")}</p>
                    <p>Updated: {format(new Date(contact.updated_at), "MMM d, yyyy")}</p>
                    {contact.source && <p>Source: {contact.source}</p>}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={contact.id} />
            </TabsContent>

            <TabsContent value="enrichment" className="mt-4">
              {contact.enrichment_ai ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</h4>
                  <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
                    {JSON.stringify(contact.enrichment_ai, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  No enrichment data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contact.first_name} {contact.last_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteContact.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
