import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFundingRounds, useCreateFundingRound, useDeleteFundingRound } from "@/hooks/use-company-details";
import { useCompanyPeople, useCreateCompanyPerson, useDeleteCompanyPerson } from "@/hooks/use-company-details";
import { useCompanyPricingTiers, useCreateCompanyPricing, useDeleteCompanyPricing } from "@/hooks/use-company-details";
import { useCompanyRelationships, useCreateCompanyRelationship, useDeleteCompanyRelationship } from "@/hooks/use-company-details";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ExternalLink, DollarSign, Users, Tag, Link2, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/crm";

const ROUND_TYPES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Bridge", "Debt", "Grant", "Undisclosed"];
const RELATIONSHIP_TYPES = ["competitor", "partner", "integration", "acquired_by", "parent_of", "alternative_to"];

function formatUSD(value: number | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

// ── Funding Rounds Section ──────────────────────────────────────────────
export function FundingRoundsSection({ companyId }: { companyId: string }) {
  const { data: rounds = [], isLoading } = useFundingRounds(companyId);
  const createRound = useCreateFundingRound();
  const deleteRound = useDeleteFundingRound();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createRound.mutateAsync({
        company_id: companyId,
        round_type: fd.get("round_type") as string,
        amount: fd.get("amount") ? parseFloat(fd.get("amount") as string) : null,
        valuation_pre: fd.get("valuation_pre") ? parseFloat(fd.get("valuation_pre") as string) : null,
        valuation_post: fd.get("valuation_post") ? parseFloat(fd.get("valuation_post") as string) : null,
        date: (fd.get("date") as string) || null,
        lead_investor: (fd.get("lead_investor") as string) || null,
        other_investors: (fd.get("other_investors") as string) || null,
        source_url: (fd.get("source_url") as string) || null,
        notes: (fd.get("notes") as string) || null,
      });
      toast({ title: "Funding round added" });
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> Funding Rounds ({rounds.length})
        </h4>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Round
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : rounds.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No funding rounds recorded</p>
      ) : (
        <div className="space-y-2">
          {rounds.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{r.round_type}</Badge>
                  <span className="text-sm font-mono font-medium text-foreground">{formatUSD(r.amount)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {r.date && <span>{r.date}</span>}
                  {r.lead_investor && <span>Lead: {r.lead_investor}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteRound.mutate({ id: r.id, companyId })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Add Funding Round</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Round Type *</Label>
              <Select name="round_type" defaultValue="Seed">
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUND_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="hidden" name="round_type" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (USD)</Label>
                <Input name="amount" type="number" placeholder="5000000" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input name="date" type="date" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lead Investor</Label>
              <Input name="lead_investor" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Other Investors</Label>
              <Input name="other_investors" placeholder="Comma-separated" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pre-money Valuation</Label>
                <Input name="valuation_pre" type="number" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Post-money Valuation</Label>
                <Input name="valuation_post" type="number" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source URL</Label>
              <Input name="source_url" type="url" className="bg-secondary border-border" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRound.isPending}>
                {createRound.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Round
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Key People Section ──────────────────────────────────────────────────
export function KeyPeopleSection({ companyId }: { companyId: string }) {
  const { data: people = [], isLoading } = useCompanyPeople(companyId);
  const createPerson = useCreateCompanyPerson();
  const deletePerson = useDeleteCompanyPerson();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createPerson.mutateAsync({
        company_id: companyId,
        name: fd.get("name") as string,
        role: (fd.get("role") as string) || null,
        is_founder: fd.get("is_founder") === "on",
        email: (fd.get("email") as string) || null,
        phone: (fd.get("phone") as string) || null,
        linkedin_url: (fd.get("linkedin_url") as string) || null,
        twitter_handle: (fd.get("twitter_handle") as string) || null,
        notes: (fd.get("notes") as string) || null,
        contact_id: null,
      });
      toast({ title: "Person added" });
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Key People ({people.length})
        </h4>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Person
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : people.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No key people recorded</p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">{p.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                  {p.is_founder && <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700"><Crown className="w-3 h-3 mr-0.5" />Founder</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {p.role && <span>{p.role}</span>}
                  {p.email && <span>· {p.email}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.linkedin_url && (
                    <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>
                  )}
                  {p.twitter_handle && (
                    <a href={`https://x.com/${p.twitter_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Twitter</a>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deletePerson.mutate({ id: p.id, companyId })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Add Key Person</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input name="name" required className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input name="role" placeholder="CEO, CTO, etc." className="bg-secondary border-border" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" name="is_founder" id="is_founder" className="rounded border-border" />
                <Label htmlFor="is_founder" className="text-sm">Founder</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input name="email" type="email" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input name="phone" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input name="linkedin_url" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Twitter Handle</Label>
                <Input name="twitter_handle" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPerson.isPending}>
                {createPerson.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Person
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Pricing Tiers Section ───────────────────────────────────────────────
export function PricingTiersSection({ companyId }: { companyId: string }) {
  const { data: tiers = [], isLoading } = useCompanyPricingTiers(companyId);
  const createTier = useCreateCompanyPricing();
  const deleteTier = useDeleteCompanyPricing();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createTier.mutateAsync({
        company_id: companyId,
        tier_name: fd.get("tier_name") as string,
        price_monthly: fd.get("price_monthly") ? parseFloat(fd.get("price_monthly") as string) : null,
        price_yearly: fd.get("price_yearly") ? parseFloat(fd.get("price_yearly") as string) : null,
        currency: "USD",
        features: (fd.get("features") as string) || null,
        is_most_popular: fd.get("is_most_popular") === "on",
        sort_order: 0,
        last_verified_at: null,
        notes: null,
      });
      toast({ title: "Pricing tier added" });
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-3 w-3" /> Pricing Tiers ({tiers.length})
        </h4>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Tier
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No pricing tiers recorded</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {tiers.map((t) => (
            <div key={t.id} className={cn("p-3 rounded-lg border bg-secondary/30", t.is_most_popular ? "border-primary" : "border-border")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.tier_name}</span>
                  {t.is_most_popular && <Badge className="text-xs bg-primary text-primary-foreground">Popular</Badge>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTier.mutate({ id: t.id, companyId })}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm">
                {t.price_monthly != null && <span className="font-mono">${t.price_monthly}/mo</span>}
                {t.price_yearly != null && <span className="font-mono text-muted-foreground">${t.price_yearly}/yr</span>}
              </div>
              {t.features && <p className="text-xs text-muted-foreground mt-1">{t.features}</p>}
              {t.last_verified_at && <p className="text-xs text-muted-foreground mt-1">Verified: {t.last_verified_at}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Add Pricing Tier</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tier Name *</Label>
              <Input name="tier_name" required placeholder="Free, Pro, Enterprise…" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Price</Label>
                <Input name="price_monthly" type="number" step="0.01" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price</Label>
                <Input name="price_yearly" type="number" step="0.01" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Key Features</Label>
              <Input name="features" placeholder="Comma-separated" className="bg-secondary border-border" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_most_popular" id="is_most_popular" className="rounded border-border" />
              <Label htmlFor="is_most_popular" className="text-sm">Most Popular Plan</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTier.isPending}>
                {createTier.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Tier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Related Companies Section ───────────────────────────────────────────
export function RelatedCompaniesSection({ companyId, onNavigate }: { companyId: string; onNavigate?: (company: Company) => void }) {
  const { data: relationships = [], isLoading } = useCompanyRelationships(companyId);
  const { data: allCompanies = [] } = useCompanies();
  const createRel = useCreateCompanyRelationship();
  const deleteRel = useDeleteCompanyRelationship();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [relType, setRelType] = useState("competitor");

  const grouped = relationships.reduce((acc, r) => {
    const type = r.relationship_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {} as Record<string, typeof relationships>);

  const handleAdd = async () => {
    if (!selectedCompany) return;
    try {
      await createRel.mutateAsync({
        company_a_id: companyId,
        company_b_id: selectedCompany,
        relationship_type: relType,
      });
      toast({ title: "Relationship added" });
      setAddOpen(false);
      setSelectedCompany("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const typeLabels: Record<string, string> = {
    competitor: "Competitors",
    partner: "Partners",
    integration: "Integrations",
    acquired_by: "Acquired By",
    parent_of: "Parent Of",
    alternative_to: "Alternatives",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="h-3 w-3" /> Related Companies ({relationships.length})
        </h4>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Relationship
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : relationships.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No related companies</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, rels]) => (
            <div key={type}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{typeLabels[type] ?? type}</p>
              <div className="space-y-1.5">
                {rels.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-secondary/30">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {(r as any).related_company?.logo_url ? (
                        <img src={(r as any).related_company.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-primary font-semibold">{(r as any).related_company?.name?.[0] ?? "?"}</span>
                      )}
                    </div>
                    <span className="text-sm text-foreground flex-1 truncate">{(r as any).related_company?.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRel.mutate({ id: r.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Add Company Relationship</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {allCompanies.filter((c) => c.id !== companyId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Relationship Type</Label>
              <Select value={relType} onValueChange={setRelType}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{typeLabels[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={createRel.isPending || !selectedCompany}>
                {createRel.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
