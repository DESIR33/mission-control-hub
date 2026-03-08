import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
import { AssociateContactPopover } from "./AssociateContactPopover";
import { Button } from "@/components/ui/button";
import { useDeleteCompany } from "@/hooks/use-companies";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useDeals } from "@/hooks/use-deals";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Globe, Linkedin, Twitter, Instagram, MapPin, Building2,
  Users, DollarSign, Clock, Pencil, Trash2, Loader2, Sparkles,
  Film, Play, Lightbulb, TrendingUp, Target, BarChart3,
  Phone, MessageCircle, Facebook, Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import type { Company, Activity, Contact } from "@/types/crm";
import { format, differenceInDays } from "date-fns";

const tierLabels: Record<string, { label: string; color: string }> = {
  none: { label: "\u2014", color: "" },
  silver: { label: "\uD83E\uDD48 Silver", color: "text-muted-foreground" },
  gold: { label: "\uD83E\uDD47 Gold", color: "text-warning" },
  platinum: { label: "\uD83D\uDC8E Platinum", color: "text-primary" },
};

interface CompanyDetailSheetProps {
  company: Company | null;
  activities: Activity[];
  companyContacts: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
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

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const videoStatusTone: Record<string, string> = {
  idea: "bg-slate-100 text-slate-700",
  scripting: "bg-blue-100 text-blue-700",
  recording: "bg-amber-100 text-amber-700",
  editing: "bg-orange-100 text-orange-700",
  scheduled: "bg-purple-100 text-purple-700",
  published: "bg-emerald-100 text-emerald-700",
};

export function CompanyDetailSheet({ company, activities, companyContacts, open, onOpenChange, onEdit, onDeleted }: CompanyDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  // Fetch video queue items and deals for the company
  const { data: allVideos = [] } = useVideoQueue();
  const { data: allDeals = [] } = useDeals();

  // Filter videos linked to this company (as brand or sponsor)
  const companyVideos = useMemo(() => {
    if (!company) return [];
    return allVideos.filter(
      (v) => v.company?.id === company.id || v.sponsoringCompany?.id === company.id
    );
  }, [allVideos, company]);

  // Split into published videos and pipeline ideas
  const linkedVideos = useMemo(() => companyVideos.filter((v) => v.status === "published"), [companyVideos]);
  const pipelineIdeas = useMemo(() => companyVideos.filter((v) => v.status !== "published"), [companyVideos]);

  // Revenue from deals linked to this company
  const companyDeals = useMemo(() => {
    if (!company) return [];
    return allDeals.filter((d) => d.company?.id === company.id);
  }, [allDeals, company]);

  const totalRevenue = useMemo(
    () => companyDeals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (d.value ?? 0), 0),
    [companyDeals]
  );

  // ── Partnership Scorecard ────────────────────────────────────────────
  const scorecard = useMemo(() => {
    if (!company) return null;

    const wonDeals = companyDeals.filter((d) => d.stage === "closed_won");
    const lostDeals = companyDeals.filter((d) => d.stage === "closed_lost");
    const closedDeals = wonDeals.length + lostDeals.length;
    const openDeals = companyDeals.filter(
      (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
    );
    const pipelineValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const winRate = closedDeals > 0 ? wonDeals.length / closedDeals : 0;
    const revenuePerVideo = linkedVideos.length > 0 ? totalRevenue / linkedVideos.length : 0;
    const relationshipDays = differenceInDays(new Date(), new Date(company.created_at));

    // Compute grade (0-100 score, mapped to A/B/C/D)
    let score = 0;
    // Revenue contribution (0-30 pts)
    if (totalRevenue >= 10000) score += 30;
    else if (totalRevenue >= 5000) score += 22;
    else if (totalRevenue >= 1000) score += 15;
    else if (totalRevenue > 0) score += 8;
    // Win rate (0-25 pts)
    if (closedDeals > 0) {
      score += Math.round(winRate * 25);
    }
    // Video engagement (0-20 pts)
    if (companyVideos.length >= 5) score += 20;
    else if (companyVideos.length >= 3) score += 15;
    else if (companyVideos.length >= 1) score += 8;
    // Pipeline momentum (0-15 pts)
    if (openDeals.length >= 2) score += 15;
    else if (openDeals.length === 1) score += 10;
    // Relationship depth - contacts (0-10 pts)
    if (companyContacts.length >= 3) score += 10;
    else if (companyContacts.length >= 1) score += 5;

    let grade: "A" | "B" | "C" | "D";
    let gradeColor: string;
    if (score >= 70) { grade = "A"; gradeColor = "text-emerald-600 bg-emerald-50 border-emerald-200"; }
    else if (score >= 45) { grade = "B"; gradeColor = "text-blue-600 bg-blue-50 border-blue-200"; }
    else if (score >= 25) { grade = "C"; gradeColor = "text-amber-600 bg-amber-50 border-amber-200"; }
    else { grade = "D"; gradeColor = "text-slate-500 bg-slate-50 border-slate-200"; }

    return {
      totalRevenue,
      revenuePerVideo,
      winRate,
      closedDeals,
      wonDeals: wonDeals.length,
      pipelineValue,
      openDeals: openDeals.length,
      totalCollabs: companyVideos.length,
      relationshipDays,
      score,
      grade,
      gradeColor,
    };
  }, [company, companyDeals, companyVideos, linkedVideos, totalRevenue, companyContacts]);

  if (!company) return null;

  const tier = tierLabels[company.vip_tier];

  const handleDelete = async () => {
    try {
      await deleteCompany.mutateAsync(company.id);
      toast({ title: "Company deleted" });
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const hasEnrichment = company.enrichment_brandfetch || company.enrichment_clay || company.enrichment_firecrawl;

  const handleEnrich = async () => {
    if (!workspaceId) return;
    setIsEnriching(true);
    try {
      const { error } = await supabase.functions.invoke("enrich-company", {
        body: { workspace_id: workspaceId, company_id: company.id },
      });
      if (error) throw error;
      toast({ title: "Company enriched", description: "Enrichment data has been updated." });
    } catch (err: any) {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-foreground text-lg">
                  {company.name}
                </SheetTitle>
                {company.industry && (
                  <p className="text-sm text-muted-foreground">{company.industry}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {company.vip_tier !== "none" && (
                <span className={cn("text-xs", tier.color)}>{tier.label}</span>
              )}
              {company.size && (
                <Badge variant="outline" className="text-xs">{company.size} employees</Badge>
              )}
              {totalRevenue > 0 && (
                <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalRevenue)} revenue
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Partnership Scorecard — always visible */}
          {scorecard && (scorecard.totalCollabs > 0 || scorecard.closedDeals > 0) && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" />
                  Partnership Scorecard
                </h4>
                <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold", scorecard.gradeColor)}>
                  {scorecard.grade}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">
                    {scorecard.totalRevenue > 0
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.totalRevenue)
                      : "$0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lifetime Rev</p>
                </div>
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">
                    {scorecard.revenuePerVideo > 0
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.revenuePerVideo)
                      : "$0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rev / Video</p>
                </div>
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">
                    {scorecard.closedDeals > 0 ? `${Math.round(scorecard.winRate * 100)}%` : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Win Rate</p>
                </div>
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">{scorecard.totalCollabs}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Collabs</p>
                </div>
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">
                    {scorecard.pipelineValue > 0
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.pipelineValue)
                      : "$0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pipeline</p>
                </div>
                <div className="rounded-lg bg-card border border-border px-2.5 py-2 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">
                    {scorecard.relationshipDays >= 365
                      ? `${(scorecard.relationshipDays / 365).toFixed(1)}y`
                      : scorecard.relationshipDays >= 30
                        ? `${Math.round(scorecard.relationshipDays / 30)}mo`
                        : `${scorecard.relationshipDays}d`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rel. Age</p>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="videos" className="flex-1">
                Videos ({companyVideos.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">
                Contacts ({companyContacts.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              {/* Company Info */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company Info</h4>
                <div className="space-y-0.5">
                  <DetailRow icon={Globe} label="Website" value={company.website} href={company.website ?? undefined} />
                  <DetailRow icon={Mail} label="Email" value={company.primary_email} href={company.primary_email ? `mailto:${company.primary_email}` : undefined} />
                  <DetailRow icon={Mail} label="Secondary Email" value={company.secondary_email} href={company.secondary_email ? `mailto:${company.secondary_email}` : undefined} />
                  <DetailRow icon={MapPin} label="Location" value={company.location} />
                  <DetailRow icon={Users} label="Size" value={company.size} />
                  <DetailRow icon={DollarSign} label="Revenue" value={company.revenue} />
                </div>
              </div>

              {company.description && (
                <>
                  <Separator className="bg-border" />
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{company.description}</p>
                  </div>
                </>
              )}

              <Separator className="bg-border" />

              {/* Social */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social</h4>
                <div className="space-y-0.5">
                  <DetailRow icon={Twitter} label="Twitter / X" value={company.social_twitter} href={company.social_twitter ? `https://x.com/${company.social_twitter.replace("@", "")}` : undefined} />
                  <DetailRow icon={Linkedin} label="LinkedIn" value={company.social_linkedin} href={company.social_linkedin ? `https://linkedin.com/company/${company.social_linkedin}` : undefined} />
                  <DetailRow icon={Instagram} label="Instagram" value={company.social_instagram} href={company.social_instagram ? `https://instagram.com/${company.social_instagram.replace("@", "")}` : undefined} />
                </div>
              </div>

              <Separator className="bg-border" />

              {/* SLA */}
              {company.response_sla_minutes && (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">SLA</h4>
                    <DetailRow icon={Clock} label="Response SLA" value={`${company.response_sla_minutes} min`} />
                  </div>
                  <Separator className="bg-border" />
                </>
              )}

              {/* Notes */}
              {company.notes && (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{company.notes}</p>
                  </div>
                  <Separator className="bg-border" />
                </>
              )}

              {/* Enrichment */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="w-full"
                >
                  {isEnriching ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isEnriching ? "Enriching..." : "Enrich Company"}
                </Button>
                {hasEnrichment && (
                  <div className="mt-3 space-y-3">
                    {company.enrichment_brandfetch && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brandfetch</h4>
                        <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono mt-1">
                          {JSON.stringify(company.enrichment_brandfetch, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {format(new Date(company.created_at), "MMM d, yyyy")}</p>
                <p>Updated: {format(new Date(company.updated_at), "MMM d, yyyy")}</p>
              </div>
            </TabsContent>

            {/* Videos & Content Pipeline Tab */}
            <TabsContent value="videos" className="mt-4 space-y-6">
              {/* Revenue Summary */}
              {companyDeals.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Revenue Generated
                  </h4>
                  <div className="space-y-1.5">
                    {companyDeals.map((deal) => (
                      <div key={deal.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground truncate">{deal.title}</span>
                        <span className={cn(
                          "text-xs font-mono font-medium",
                          deal.stage === "closed_won" ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                          {deal.value != null
                            ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value)
                            : "$0"}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{deal.stage.replace("_", " ")}</Badge>
                      </div>
                    ))}
                    {totalRevenue > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-border">
                        <span className="text-xs font-medium text-muted-foreground">Total Earned</span>
                        <span className="text-sm font-mono font-bold text-emerald-600">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Published Videos */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="h-3 w-3" />
                    Published Videos ({linkedVideos.length})
                  </span>
                </h4>
                {linkedVideos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No published videos linked to this company</p>
                ) : (
                  <div className="space-y-2">
                    {linkedVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                        <Film className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {video.targetPublishDate && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(video.targetPublishDate), "MMM d, yyyy")}
                              </p>
                            )}
                            {video.sponsoringCompany?.id === company.id && (
                              <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">Sponsor</Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={cn("text-xs capitalize", videoStatusTone[video.status])}>
                          {video.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pipeline Ideas */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    Content Pipeline ({pipelineIdeas.length})
                  </span>
                </h4>
                {pipelineIdeas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pipeline ideas linked to this company</p>
                ) : (
                  <div className="space-y-2">
                    {pipelineIdeas.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {video.description || "No description"}
                          </p>
                        </div>
                        <Badge className={cn("text-xs capitalize", videoStatusTone[video.status])}>
                          {video.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Associated Contacts
                </h4>
                <AssociateContactPopover companyId={company.id} existingContactIds={companyContacts.map((c) => c.id)} />
              </div>

              {companyContacts.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  No contacts associated with this company
                </div>
              ) : (
                <div className="space-y-2">
                  {companyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <div className="flex items-center gap-2">
                          {contact.role && (
                            <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                          )}
                          {contact.email && (
                            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs uppercase tracking-wider shrink-0", statusColors[contact.status])}
                      >
                        {contact.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={company.id} entityType="company" />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {company.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCompany.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompany.isPending ? (
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
