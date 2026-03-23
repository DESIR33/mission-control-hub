import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, ChevronDown, Briefcase } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { useCreateCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function AddCompanyPage() {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const [socialOpen, setSocialOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [isAgency, setIsAgency] = useState(false);

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
        size: (form.get("size") as string) || undefined,
        location: (form.get("location") as string) || undefined,
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
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Company created" });
      navigate("/network/companies");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/relationships?tab=companies")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">New Company</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                <Label htmlFor="is_agency" className="text-sm font-medium cursor-pointer">This is an agency</Label>
                <p className="text-xs text-muted-foreground">Agencies represent and work on behalf of other companies</p>
              </div>
            </div>
            <Switch id="is_agency" checked={isAgency} onCheckedChange={setIsAgency} />
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
              <div className="space-y-1.5">
                <Label htmlFor="social_producthunt" className="text-xs">Product Hunt</Label>
                <Input id="social_producthunt" name="social_producthunt" placeholder="producthunt.com/products/..." className="bg-secondary border-border" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} className="bg-secondary border-border" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Company
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/relationships?tab=companies")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

