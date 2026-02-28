import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCreateContact } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddContactDialog() {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [socialOpen, setSocialOpen] = useState(false);
  const createContact = useCreateContact();
  const { data: companies = [] } = useCompanies();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await createContact.mutateAsync({
        first_name: form.get("first_name") as string,
        last_name: (form.get("last_name") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        status: form.get("status") as string,
        role: (form.get("role") as string) || undefined,
        source: (form.get("source") as string) || undefined,
        company_id: companyId && companyId !== "none" ? companyId : undefined,
        vip_tier: form.get("vip_tier") as string,
        website: (form.get("website") as string) || undefined,
        social_twitter: (form.get("social_twitter") as string) || undefined,
        social_linkedin: (form.get("social_linkedin") as string) || undefined,
        social_facebook: (form.get("social_facebook") as string) || undefined,
        social_instagram: (form.get("social_instagram") as string) || undefined,
        social_telegram: (form.get("social_telegram") as string) || undefined,
        social_whatsapp: (form.get("social_whatsapp") as string) || undefined,
        social_discord: (form.get("social_discord") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Contact created" });
      setCompanyId("");
      setSocialOpen(false);
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" name="first_name" required className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" name="last_name" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" className="bg-secondary border-border" placeholder="+1 555-123-4567" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select name="status" defaultValue="lead">
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
              <Select name="vip_tier" defaultValue="none">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="silver">{"\u{1F948}"} Silver</SelectItem>
                  <SelectItem value="gold">{"\u{1F947}"} Gold</SelectItem>
                  <SelectItem value="platinum">{"\u{1F48E}"} Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" placeholder="e.g. VP Marketing" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" placeholder="e.g. LinkedIn" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Company</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Social Media - Collapsible */}
          <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-0 font-medium text-sm">
                Social Media Profiles
                <ChevronDown className={cn("h-4 w-4 transition-transform", socialOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="social_twitter" className="text-xs">Twitter / X</Label>
                  <Input id="social_twitter" name="social_twitter" placeholder="@handle" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_linkedin" className="text-xs">LinkedIn</Label>
                  <Input id="social_linkedin" name="social_linkedin" placeholder="linkedin.com/in/..." className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="social_facebook" className="text-xs">Facebook</Label>
                  <Input id="social_facebook" name="social_facebook" placeholder="facebook.com/..." className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_instagram" className="text-xs">Instagram</Label>
                  <Input id="social_instagram" name="social_instagram" placeholder="@handle" className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="social_telegram" className="text-xs">Telegram</Label>
                  <Input id="social_telegram" name="social_telegram" placeholder="@username" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_whatsapp" className="text-xs">WhatsApp</Label>
                  <Input id="social_whatsapp" name="social_whatsapp" placeholder="+1 555-123-4567" className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="social_discord" className="text-xs">Discord</Label>
                  <Input id="social_discord" name="social_discord" placeholder="username#1234" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs">Website</Label>
                  <Input id="website" name="website" placeholder="https://..." className="bg-secondary border-border" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} className="bg-secondary border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
