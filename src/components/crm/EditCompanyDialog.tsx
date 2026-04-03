import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { useUpdateCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Company } from "@/types/crm";

const OUTREACH_STATUSES = [
  { value: "not_contacted", label: "Not Contacted", color: "bg-muted-foreground" },
  { value: "researching", label: "Researching", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "in_conversation", label: "In Conversation", color: "bg-orange-500" },
  { value: "negotiating", label: "Negotiating", color: "bg-purple-500" },
  { value: "sponsor", label: "Sponsor", color: "bg-emerald-500" },
  { value: "former_sponsor", label: "Former Sponsor", color: "bg-teal-500" },
  { value: "passed", label: "Passed", color: "bg-destructive" },
  { value: "not_a_fit", label: "Not a Fit", color: "bg-muted-foreground" },
];

const FUNDING_STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Public", "Bootstrapped", "Unknown"];
const PRICING_MODELS = ["Free", "Freemium", "Paid", "Enterprise", "Open Source", "Usage-Based"];
const COMPETITOR_GROUPS = [
  "AI Code Editors", "AI Website Builders", "AI Design Tools", "AI Agents", "AI Video Tools",
  "AI 3D Tools", "AI Automation", "AI Browser Tools", "AI Data Tools", "AI SEO Tools",
  "AI Media Generation", "AI Search", "Developer Tools", "Other",
];

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
  const [outreachStatus, setOutreachStatus] = useState("not_contacted");
  const [sponsorFitScore, setSponsorFitScore] = useState<number>(5);
  const [fundingStage, setFundingStage] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [competitorGroup, setCompetitorGroup] = useState("");

  useEffect(() => {
    if (company) {
      setVipTier(company.vip_tier);
      setSize(company.size ?? "");
      setLogoUrl(company.logo_url ?? "");
      setOutreachStatus(company.outreach_status ?? "not_contacted");
      setSponsorFitScore(company.sponsor_fit_score ?? 5);
      setFundingStage(company.funding_stage ?? "");
      setPricingModel(company.pricing_model ?? "");
      setCompetitorGroup(company.competitor_group ?? "");
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
    const totalFundingStr = (form.get("total_funding") as string)?.replace(/[^0-9.]/g, "");

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
        social_github: (form.get("social_github") as string) || undefined,
        social_discord: (form.get("social_discord") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        // New fields
        funding_stage: fundingStage || null,
        total_funding: totalFundingStr ? parseFloat(totalFundingStr) : null,
        last_funding_date: (form.get("last_funding_date") as string) || null,
        founded_year: (form.get("founded_year") as string) ? parseInt(form.get("founded_year") as string) : null,
        founder_names: (form.get("founder_names") as string) || null,
        pricing_model: pricingModel || null,
        tech_stack: (form.get("tech_stack") as string) || null,
        outreach_status: outreachStatus,
        sponsor_fit_score: sponsorFitScore,
        competitor_group: competitorGroup || null,
      });
      toast({ title: "Company updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const fitColor = sponsorFitScore <= 3 ? "text-destructive" : sponsorFitScore <= 6 ? "text-yellow-500" : "text-emerald-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <ImageUpload value={logoUrl} onChange={setLogoUrl} onUpload={handleLogoUpload} label="Company Logo" shape="rounded" size="lg" />

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
              <Label className="text-xs">Country</Label>
              <Input name="country" defaultValue={company.country ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input name="state" defaultValue={company.state ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input name="city" defaultValue={company.city ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" type="tel" defaultValue={company.phone ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input name="social_whatsapp" defaultValue={company.social_whatsapp ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>VIP Tier</Label>
              <Select value={vipTier} onValueChange={setVipTier}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="silver">🥈 Silver</SelectItem>
                  <SelectItem value="gold">🥇 Gold</SelectItem>
                  <SelectItem value="platinum">💎 Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Revenue</Label>
              <Input name="revenue" defaultValue={company.revenue ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary Email</Label>
              <Input name="secondary_email" type="email" defaultValue={company.secondary_email ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <Separator className="bg-border" />
          <h3 className="text-sm font-semibold text-foreground">Funding & Background</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Funding Stage</Label>
              <Select value={fundingStage} onValueChange={setFundingStage}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {FUNDING_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Funding (USD)</Label>
              <Input name="total_funding" defaultValue={company.total_funding?.toString() ?? ""} placeholder="e.g. 5000000" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Last Funding Date</Label>
              <Input name="last_funding_date" type="date" defaultValue={company.last_funding_date ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Founded Year</Label>
              <Input name="founded_year" type="number" min={1900} max={2030} defaultValue={company.founded_year?.toString() ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Founder Names</Label>
            <Input name="founder_names" placeholder="Comma-separated" defaultValue={company.founder_names ?? ""} className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pricing Model</Label>
              <Select value={pricingModel} onValueChange={setPricingModel}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {PRICING_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tech Stack</Label>
              <Input name="tech_stack" defaultValue={company.tech_stack ?? ""} className="bg-secondary border-border" />
            </div>
          </div>

          <Separator className="bg-border" />
          <h3 className="text-sm font-semibold text-foreground">Sponsor Pipeline</h3>

          <div className="space-y-1.5">
            <Label>Outreach Status</Label>
            <Select value={outreachStatus} onValueChange={setOutreachStatus}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTREACH_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sponsor Fit Score: <span className={`font-bold ${fitColor}`}>{sponsorFitScore}/10</span></Label>
            <Slider
              value={[sponsorFitScore]}
              onValueChange={([v]) => setSponsorFitScore(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Competitor Group</Label>
            <Select value={competitorGroup} onValueChange={setCompetitorGroup}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {COMPETITOR_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />
          <h3 className="text-sm font-semibold text-foreground">Social Links</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Twitter / X</Label>
              <Input name="social_twitter" defaultValue={company.social_twitter ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn</Label>
              <Input name="social_linkedin" defaultValue={company.social_linkedin ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Facebook</Label>
              <Input name="social_facebook" defaultValue={company.social_facebook ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input name="social_instagram" defaultValue={company.social_instagram ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>YouTube</Label>
              <Input name="social_youtube" defaultValue={company.social_youtube ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>TikTok</Label>
              <Input name="social_tiktok" defaultValue={company.social_tiktok ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GitHub</Label>
              <Input name="social_github" defaultValue={company.social_github ?? ""} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Discord</Label>
              <Input name="social_discord" defaultValue={company.social_discord ?? ""} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Product Hunt</Label>
            <Input name="social_producthunt" defaultValue={company.social_producthunt ?? ""} className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} defaultValue={company.notes ?? ""} className="bg-secondary border-border" />
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
