import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { AgencyClientsPanel } from "@/components/companies/AgencyClientsPanel";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Briefcase,
  ChevronDown,
  Globe,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Users,
  Share2,
  StickyNote,
} from "lucide-react";

export default function EditCompanyPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateCompany = useUpdateCompany();
  const { data: companies = [], isLoading } = useCompanies();
  const company = companies.find((c) => c.id === companyId) ?? null;

  const [vipTier, setVipTier] = useState("none");
  const [size, setSize] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isAgency, setIsAgency] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  useEffect(() => {
    if (company) {
      setVipTier(company.vip_tier);
      setSize(company.size ?? "");
      setLogoUrl(company.logo_url ?? "");
      setIsAgency(company.is_agency ?? false);
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

  const goBack = () => navigate(`/relationships/companies/${companyId}`);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;
    const form = new FormData(e.currentTarget);

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: form.get("name") as string,
        logo_url: logoUrl || undefined,
        is_agency: isAgency,
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
        social_crunchbase: (form.get("social_crunchbase") as string) || undefined,
        social_whatsapp: (form.get("social_whatsapp") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Company updated" });
      goBack();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-4 md:p-6 min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate("/network/companies")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </Button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Company Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to {company.name}
      </Button>

      {/* Header with logo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="h-24 sm:h-28 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/40 to-accent/20 border border-border" />
        <div className="relative px-4 sm:px-6 -mt-10 sm:-mt-12 flex items-end gap-4">
          {company.logo_url ? (
            <img
              src={logoUrl || company.logo_url}
              alt={company.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">Edit {company.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isAgency && (
                <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary gap-1">
                  <Briefcase className="w-3 h-3" />
                  Agency
                </Badge>
              )}
              {company.industry && (
                <Badge variant="outline" className="text-xs">{company.industry}</Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form — left 2 columns */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Info */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <Label htmlFor="edit_is_agency" className="text-sm font-medium cursor-pointer">This is an agency</Label>
                      <p className="text-xs text-muted-foreground">Agencies represent and work on behalf of other companies</p>
                    </div>
                  </div>
                  <Switch id="edit_is_agency" checked={isAgency} onCheckedChange={setIsAgency} />
                </div>

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
                    <Input id="edit_website" name="website" defaultValue={company.website ?? ""} placeholder="https://..." className="bg-secondary border-border" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="edit_description">Description</Label>
                  <Textarea id="edit_description" name="description" rows={2} defaultValue={company.description ?? ""} className="bg-secondary border-border" />
                </div>
              </CardContent>
            </Card>

            {/* Contact & Location */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Contact & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_primary_email">Primary Email</Label>
                    <Input id="edit_primary_email" name="primary_email" type="email" defaultValue={company.primary_email ?? ""} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_secondary_email">Secondary Email</Label>
                    <Input id="edit_secondary_email" name="secondary_email" type="email" defaultValue={company.secondary_email ?? ""} className="bg-secondary border-border" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_phone">Phone</Label>
                    <Input id="edit_phone" name="phone" type="tel" defaultValue={company.phone ?? ""} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_social_whatsapp">WhatsApp</Label>
                    <Input id="edit_social_whatsapp" name="social_whatsapp" defaultValue={company.social_whatsapp ?? ""} className="bg-secondary border-border" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_location">Location</Label>
                  <Input id="edit_location" name="location" defaultValue={company.location ?? ""} placeholder="e.g. San Francisco, CA" className="bg-secondary border-border" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="edit_revenue">Revenue</Label>
                  <Input id="edit_revenue" name="revenue" defaultValue={company.revenue ?? ""} placeholder="e.g. $1M-$10M" className="bg-secondary border-border" />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5" />
                        Social Media Profiles
                      </CardTitle>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", socialOpen && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-4 px-0">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_twitter" className="text-xs">Twitter / X</Label>
                          <Input id="edit_social_twitter" name="social_twitter" defaultValue={company.social_twitter ?? ""} placeholder="@handle" className="bg-secondary border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_linkedin" className="text-xs">LinkedIn</Label>
                          <Input id="edit_social_linkedin" name="social_linkedin" defaultValue={company.social_linkedin ?? ""} placeholder="linkedin.com/company/..." className="bg-secondary border-border" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_facebook" className="text-xs">Facebook</Label>
                          <Input id="edit_social_facebook" name="social_facebook" defaultValue={company.social_facebook ?? ""} className="bg-secondary border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_instagram" className="text-xs">Instagram</Label>
                          <Input id="edit_social_instagram" name="social_instagram" defaultValue={company.social_instagram ?? ""} placeholder="@handle" className="bg-secondary border-border" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_youtube" className="text-xs">YouTube</Label>
                          <Input id="edit_social_youtube" name="social_youtube" defaultValue={company.social_youtube ?? ""} className="bg-secondary border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_social_tiktok" className="text-xs">TikTok</Label>
                          <Input id="edit_social_tiktok" name="social_tiktok" defaultValue={company.social_tiktok ?? ""} placeholder="@handle" className="bg-secondary border-border" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_social_producthunt" className="text-xs">Product Hunt</Label>
                        <Input id="edit_social_producthunt" name="social_producthunt" defaultValue={company.social_producthunt ?? ""} className="bg-secondary border-border" />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
            </Card>

            {/* Notes */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea id="edit_notes" name="notes" rows={4} defaultValue={company.notes ?? ""} className="bg-secondary border-border" placeholder="Internal notes about this company..." />
              </CardContent>
            </Card>

            {/* Save / Cancel */}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={updateCompany.isPending}>
                {updateCompany.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={goBack}>Cancel</Button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Agency / Client Links */}
            <AgencyClientsPanel companyId={company.id} isAgency={isAgency} />
          </div>
        </div>
      </form>
    </div>
  );
}
