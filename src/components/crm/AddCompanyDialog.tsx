import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { useCreateCompany, useCompanies } from "@/hooks/use-companies";
import CompanyDuplicateWarning from "@/components/crm/CompanyDuplicateWarning";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, ChevronDown, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function AddCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [isAgency, setIsAgency] = useState(false);
  const [dupName, setDupName] = useState("");
  const [dupEmail, setDupEmail] = useState("");
  const [dupWebsite, setDupWebsite] = useState("");
  const createCompany = useCreateCompany();
  const { data: existingCompanies = [] } = useCompanies();
  const { toast } = useToast();

  const handleLogoUpload = useCallback(async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop() ?? "png";
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from("logos").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("logos").getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await createCompany.mutateAsync({
        name: form.get("name") as string,
        logo_url: logoUrl || undefined,
        is_agency: isAgency,
        industry: (form.get("industry") as string) || undefined,
        website: (form.get("website") as string) || undefined,
        size: form.get("size") as string || undefined,
        location: (form.get("location") as string) || undefined,
        country: (form.get("country") as string) || undefined,
        state: (form.get("state") as string) || undefined,
        city: (form.get("city") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        primary_email: (form.get("primary_email") as string) || undefined,
        revenue: (form.get("revenue") as string) || undefined,
        vip_tier: form.get("vip_tier") as string,
        description: (form.get("description") as string) || undefined,
        social_twitter: (form.get("social_twitter") as string) || undefined,
        social_linkedin: (form.get("social_linkedin") as string) || undefined,
        social_youtube: (form.get("social_youtube") as string) || undefined,
        social_instagram: (form.get("social_instagram") as string) || undefined,
        social_facebook: (form.get("social_facebook") as string) || undefined,
        social_tiktok: (form.get("social_tiktok") as string) || undefined,
        social_producthunt: (form.get("social_producthunt") as string) || undefined,
        social_crunchbase: (form.get("social_crunchbase") as string) || undefined,
        social_whatsapp: (form.get("social_whatsapp") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Company created" });
      setLogoUrl("");
      setIsAgency(false);
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
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <ImageUpload
            value={logoUrl}
            onChange={setLogoUrl}
            onUpload={handleLogoUpload}
            label="Company Logo"
            shape="rounded"
            size="lg"
          />

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="dlg_is_agency" className="text-sm font-medium cursor-pointer">This is an agency</Label>
                <p className="text-xs text-muted-foreground">Represents other companies</p>
              </div>
            </div>
            <Switch id="dlg_is_agency" checked={isAgency} onCheckedChange={setIsAgency} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" name="name" required className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" placeholder="e.g. SaaS" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" placeholder="https://..." className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="e.g. San Francisco, CA" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_email">Email</Label>
              <Input id="primary_email" name="primary_email" type="email" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs">Country</Label>
              <Input id="country" name="country" placeholder="e.g. US" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-xs">State</Label>
              <Input id="state" name="state" placeholder="e.g. CA" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs">City</Label>
              <Input id="city" name="city" placeholder="e.g. San Francisco" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+1 555-0100" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social_whatsapp" className="text-xs">WhatsApp</Label>
              <Input id="social_whatsapp" name="social_whatsapp" placeholder="+1 555-0100" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select name="size">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="501-1000">501-1000</SelectItem>
                  <SelectItem value="1000+">1000+</SelectItem>
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

          <div className="space-y-1.5">
            <Label htmlFor="revenue">Revenue</Label>
            <Input id="revenue" name="revenue" placeholder="e.g. $1M-$10M" className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} className="bg-secondary border-border" />
          </div>

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
                  <Input id="social_linkedin" name="social_linkedin" placeholder="linkedin.com/company/..." className="bg-secondary border-border" />
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
                  <Label htmlFor="social_youtube" className="text-xs">YouTube</Label>
                  <Input id="social_youtube" name="social_youtube" placeholder="youtube.com/@..." className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_tiktok" className="text-xs">TikTok</Label>
                  <Input id="social_tiktok" name="social_tiktok" placeholder="@handle" className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="social_producthunt" className="text-xs">Product Hunt</Label>
                  <Input id="social_producthunt" name="social_producthunt" placeholder="producthunt.com/products/..." className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_crunchbase" className="text-xs">Crunchbase</Label>
                  <Input id="social_crunchbase" name="social_crunchbase" placeholder="crunchbase.com/organization/..." className="bg-secondary border-border" />
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
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
