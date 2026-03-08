import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { useUpdateCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Company } from "@/types/crm";

interface EditCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const updateCompany = useUpdateCompany();
  const { toast } = useToast();
  const [vipTier, setVipTier] = useState("none");
  const [size, setSize] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (company) {
      setVipTier(company.vip_tier);
      setSize(company.size ?? "");
      setLogoUrl(company.logo_url ?? "");
    }
  }, [company]);

  const handleLogoUpload = useCallback(async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop() ?? "png";
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from("logos").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("logos").getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  if (!company) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: form.get("name") as string,
        logo_url: logoUrl || undefined,
        industry: (form.get("industry") as string) || undefined,
        website: (form.get("website") as string) || undefined,
        size: size || undefined,
        location: (form.get("location") as string) || undefined,
        country: (form.get("country") as string) || undefined,
        state: (form.get("state") as string) || undefined,
        city: (form.get("city") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        primary_email: (form.get("primary_email") as string) || undefined,
        secondary_email: (form.get("secondary_email") as string) || undefined,
        revenue: (form.get("revenue") as string) || undefined,
        vip_tier: vipTier,
        social_twitter: (form.get("social_twitter") as string) || undefined,
        social_linkedin: (form.get("social_linkedin") as string) || undefined,
        social_youtube: (form.get("social_youtube") as string) || undefined,
        social_instagram: (form.get("social_instagram") as string) || undefined,
        social_facebook: (form.get("social_facebook") as string) || undefined,
        social_tiktok: (form.get("social_tiktok") as string) || undefined,
        social_producthunt: (form.get("social_producthunt") as string) || undefined,
        social_whatsapp: (form.get("social_whatsapp") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Company updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Company</DialogTitle>
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

          <div className="space-y-1.5">
            <Label htmlFor="edit_name">Company Name *</Label>
            <Input id="edit_name" name="name" required defaultValue={company.name} className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_industry">Industry</Label>
              <Input id="edit_industry" name="industry" defaultValue={company.industry ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_website">Website</Label>
              <Input id="edit_website" name="website" defaultValue={company.website ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_location">Location</Label>
              <Input id="edit_location" name="location" defaultValue={company.location ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_primary_email">Email</Label>
              <Input id="edit_primary_email" name="primary_email" type="email" defaultValue={company.primary_email ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_country" className="text-xs">Country</Label>
              <Input id="edit_country" name="country" defaultValue={company.country ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_state" className="text-xs">State</Label>
              <Input id="edit_state" name="state" defaultValue={company.state ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_city" className="text-xs">City</Label>
              <Input id="edit_city" name="city" defaultValue={company.city ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input id="edit_phone" name="phone" type="tel" defaultValue={company.phone ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_whatsapp">WhatsApp</Label>
              <Input id="edit_social_whatsapp" name="social_whatsapp" defaultValue={company.social_whatsapp ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={setSize}>
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
              <Select value={vipTier} onValueChange={setVipTier}>
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
              <Label htmlFor="edit_revenue">Revenue</Label>
              <Input id="edit_revenue" name="revenue" defaultValue={company.revenue ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_secondary_email">Secondary Email</Label>
              <Input id="edit_secondary_email" name="secondary_email" type="email" defaultValue={company.secondary_email ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_twitter">Twitter / X</Label>
              <Input id="edit_social_twitter" name="social_twitter" defaultValue={company.social_twitter ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_linkedin">LinkedIn</Label>
              <Input id="edit_social_linkedin" name="social_linkedin" defaultValue={company.social_linkedin ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_facebook">Facebook</Label>
              <Input id="edit_social_facebook" name="social_facebook" defaultValue={company.social_facebook ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_instagram">Instagram</Label>
              <Input id="edit_social_instagram" name="social_instagram" defaultValue={company.social_instagram ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_youtube">YouTube</Label>
              <Input id="edit_social_youtube" name="social_youtube" defaultValue={company.social_youtube ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_social_tiktok">TikTok</Label>
              <Input id="edit_social_tiktok" name="social_tiktok" defaultValue={company.social_tiktok ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_social_producthunt">Product Hunt</Label>
            <Input id="edit_social_producthunt" name="social_producthunt" defaultValue={company.social_producthunt ?? ""} className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea id="edit_notes" name="notes" rows={2} defaultValue={company.notes ?? ""} className="bg-secondary border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateCompany.isPending}>
              {updateCompany.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
