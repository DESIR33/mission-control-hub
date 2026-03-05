import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { AssociateContactPopover } from "@/components/crm/AssociateContactPopover";
import { EditCompanyDialog } from "@/components/crm/EditCompanyDialog";
import { useCompanies, useDeleteCompany, useCompanyContacts } from "@/hooks/use-companies";
import { useActivities } from "@/hooks/use-contacts";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useDeals } from "@/hooks/use-deals";
import { useCompanyLinkedVideos } from "@/hooks/use-company-videos";
import { useVideoCompanies } from "@/hooks/use-video-companies";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace, WorkspaceProvider } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  MapPin,
  Building2,
  Users,
  DollarSign,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  Film,
  Play,
  Lightbulb,
  BarChart3,
  Eye,
  ThumbsUp,
  ExternalLink,
} from "lucide-react";
import type { Company, Activity, Contact } from "@/types/crm";

const tierLabels: Record<string, { label: string; color: string }> = {
  none: { label: "—", color: "" },
  silver: { label: "🥈 Silver", color: "text-muted-foreground" },
  gold: { label: "🥇 Gold", color: "text-warning" },
  platinum: { label: "💎 Platinum", color: "text-primary" },
};

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const videoStatusTone: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  scripting: "bg-primary/10 text-primary",
  recording: "bg-warning/10 text-warning",
  editing: "bg-accent text-accent-foreground",
  scheduled: "bg-secondary text-secondary-foreground",
  published: "bg-success/10 text-success",
};

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function CompanyProfileContent() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const company = companies.find((c) => c.id === companyId) ?? null;

  const { data: companyContacts = [] } = useCompanyContacts(companyId ?? null);
  const { data: activities = [] } = useActivities(companyId ?? null, "company");
  const { data: allVideos = [] } = useVideoQueue();
  const { data: allDeals = [] } = useDeals();
  const { data: linkedYTVideos = [] } = useCompanyLinkedVideos(companyId);
  const deleteCompany = useDeleteCompany();

  // Filter videos from video_queue linked to this company (legacy metadata approach)
  const companyVideos = useMemo(() => {
    if (!company) return [];
    return allVideos.filter(
      (v: any) => v.company?.id === company.id || v.sponsoringCompany?.id === company.id
    );
  }, [allVideos, company]);

  const linkedVideos = useMemo(() => companyVideos.filter((v: any) => v.status === "published"), [companyVideos]);
  const pipelineIdeas = useMemo(() => companyVideos.filter((v: any) => v.status !== "published"), [companyVideos]);

  // Ad revenue from YouTube videos linked via video_companies
  const adRevenueFromLinkedVideos = useMemo(
    () => linkedYTVideos.reduce((sum, v) => sum + v.estimated_revenue, 0),
    [linkedYTVideos]
  );

  // Deals for this company
  const companyDeals = useMemo(() => {
    if (!company) return [];
    return allDeals.filter((d) => d.company?.id === company.id);
  }, [allDeals, company]);

  const dealRevenue = useMemo(
    () => companyDeals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (d.value ?? 0), 0),
    [companyDeals]
  );

  const totalRevenue = dealRevenue + adRevenueFromLinkedVideos;

  // Partnership Scorecard
  const scorecard = useMemo(() => {
    if (!company) return null;
    const wonDeals = companyDeals.filter((d) => d.stage === "closed_won");
    const lostDeals = companyDeals.filter((d) => d.stage === "closed_lost");
    const closedDeals = wonDeals.length + lostDeals.length;
    const openDeals = companyDeals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const pipelineValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const winRate = closedDeals > 0 ? wonDeals.length / closedDeals : 0;
    const revenuePerVideo = linkedVideos.length > 0 ? totalRevenue / linkedVideos.length : 0;
    const relationshipDays = differenceInDays(new Date(), new Date(company.created_at));

    let score = 0;
    if (totalRevenue >= 10000) score += 30;
    else if (totalRevenue >= 5000) score += 22;
    else if (totalRevenue >= 1000) score += 15;
    else if (totalRevenue > 0) score += 8;
    if (closedDeals > 0) score += Math.round(winRate * 25);
    if (companyVideos.length >= 5) score += 20;
    else if (companyVideos.length >= 3) score += 15;
    else if (companyVideos.length >= 1) score += 8;
    if (openDeals.length >= 2) score += 15;
    else if (openDeals.length === 1) score += 10;
    if (companyContacts.length >= 3) score += 10;
    else if (companyContacts.length >= 1) score += 5;

    let grade: "A" | "B" | "C" | "D";
    let gradeColor: string;
    if (score >= 70) { grade = "A"; gradeColor = "text-success bg-success/10 border-success/30"; }
    else if (score >= 45) { grade = "B"; gradeColor = "text-primary bg-primary/10 border-primary/30"; }
    else if (score >= 25) { grade = "C"; gradeColor = "text-warning bg-warning/10 border-warning/30"; }
    else { grade = "D"; gradeColor = "text-muted-foreground bg-muted border-border"; }

    return { totalRevenue, revenuePerVideo, winRate, closedDeals, wonDeals: wonDeals.length, pipelineValue, openDeals: openDeals.length, totalCollabs: companyVideos.length, relationshipDays, score, grade, gradeColor };
  }, [company, companyDeals, companyVideos, linkedVideos, totalRevenue, companyContacts]);

  const handleDelete = async () => {
    if (!company) return;
    try {
      await deleteCompany.mutateAsync(company.id);
      toast({ title: "Company deleted" });
      navigate("/relationships?tab=companies");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEnrich = async () => {
    if (!workspaceId || !company) return;
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

  const tier = company ? tierLabels[company.vip_tier] : null;
  const hasEnrichment = company && (company.enrichment_brandfetch || company.enrichment_clay || company.enrichment_firecrawl);

  if (companiesLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate("/relationships?tab=companies")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </Button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Company Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">This company may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/relationships?tab=companies")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Companies
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {company.industry && <span className="text-sm text-muted-foreground">{company.industry}</span>}
              {tier && company.vip_tier !== "none" && <span className={cn("text-xs", tier.color)}>{tier.label}</span>}
              {company.size && <Badge variant="outline" className="text-[10px]">{company.size} employees</Badge>}
              {totalRevenue > 0 && (
                <Badge variant="outline" className="text-[10px] border-success/30 bg-success/10 text-success">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalRevenue)} revenue
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleEnrich} disabled={isEnriching} className="gap-1.5">
            {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isEnriching ? "Enriching..." : "Enrich"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Scorecard */}
      {scorecard && (scorecard.totalCollabs > 0 || scorecard.closedDeals > 0) && (
        <Card className="mb-6 bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Partnership Scorecard
              </h4>
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold", scorecard.gradeColor)}>
                {scorecard.grade}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { val: scorecard.totalRevenue > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.totalRevenue) : "$0", label: "Lifetime Rev" },
                { val: scorecard.revenuePerVideo > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.revenuePerVideo) : "$0", label: "Rev / Video" },
                { val: scorecard.closedDeals > 0 ? `${Math.round(scorecard.winRate * 100)}%` : "--", label: "Win Rate" },
                { val: String(scorecard.totalCollabs), label: "Collabs" },
                { val: scorecard.pipelineValue > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(scorecard.pipelineValue) : "$0", label: "Pipeline" },
                { val: scorecard.relationshipDays >= 365 ? `${(scorecard.relationshipDays / 365).toFixed(1)}y` : scorecard.relationshipDays >= 30 ? `${Math.round(scorecard.relationshipDays / 30)}mo` : `${scorecard.relationshipDays}d`, label: "Rel. Age" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-secondary/30 border border-border px-3 py-2.5 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">{item.val}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content: sidebar + tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <DetailRow icon={Globe} label="Website" value={company.website} href={company.website ?? undefined} />
              <DetailRow icon={Mail} label="Email" value={company.primary_email} href={company.primary_email ? `mailto:${company.primary_email}` : undefined} />
              <DetailRow icon={Mail} label="Secondary Email" value={company.secondary_email} href={company.secondary_email ? `mailto:${company.secondary_email}` : undefined} />
              <DetailRow icon={MapPin} label="Location" value={company.location} />
              <DetailRow icon={Users} label="Size" value={company.size} />
              <DetailRow icon={DollarSign} label="Revenue" value={company.revenue} />
              {company.response_sla_minutes && (
                <DetailRow icon={Clock} label="Response SLA" value={`${company.response_sla_minutes} min`} />
              )}
            </CardContent>
          </Card>

          {company.description && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{company.description}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <DetailRow icon={Twitter} label="Twitter / X" value={company.social_twitter} href={company.social_twitter ? `https://x.com/${company.social_twitter.replace("@", "")}` : undefined} />
              <DetailRow icon={Linkedin} label="LinkedIn" value={company.social_linkedin} href={company.social_linkedin ? `https://linkedin.com/company/${company.social_linkedin}` : undefined} />
              <DetailRow icon={Instagram} label="Instagram" value={company.social_instagram} href={company.social_instagram ? `https://instagram.com/${company.social_instagram.replace("@", "")}` : undefined} />
              {!company.social_twitter && !company.social_linkedin && !company.social_instagram && (
                <p className="text-sm text-muted-foreground py-2">No social profiles linked</p>
              )}
            </CardContent>
          </Card>

          {company.notes && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          )}

          {hasEnrichment && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrichment Data</CardTitle>
              </CardHeader>
              <CardContent>
                {company.enrichment_brandfetch && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Brandfetch</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(company.enrichment_brandfetch, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-[10px] text-muted-foreground space-y-1 px-1">
            <p>Created: {format(new Date(company.created_at), "MMM d, yyyy")}</p>
            <p>Updated: {format(new Date(company.updated_at), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Main content tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">Contacts ({companyContacts.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({companyVideos.length + linkedYTVideos.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Associated Contacts</h4>
                <AssociateContactPopover companyId={company.id} existingContactIds={companyContacts.map((c) => c.id)} />
              </div>
              {companyContacts.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No contacts associated with this company
                </div>
              ) : (
                <div className="space-y-2">
                  {companyContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{contact.first_name} {contact.last_name}</p>
                        <div className="flex items-center gap-2">
                          {contact.role && <p className="text-xs text-muted-foreground truncate">{contact.role}</p>}
                          {contact.email && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider shrink-0", statusColors[contact.status])}>
                        {contact.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="mt-4 space-y-6">
              {/* Revenue Summary */}
              {(companyDeals.length > 0 || adRevenueFromLinkedVideos > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue Generated</h4>
                  <div className="space-y-1.5">
                    {companyDeals.map((deal) => (
                      <div key={deal.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground truncate">{deal.title}</span>
                        <span className={cn("text-xs font-mono font-medium", deal.stage === "closed_won" ? "text-success" : "text-muted-foreground")}>
                          {deal.value != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value) : "$0"}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">{deal.stage.replace("_", " ")}</Badge>
                      </div>
                    ))}
                    {adRevenueFromLinkedVideos > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground">YouTube Ad Revenue ({linkedYTVideos.length} videos)</span>
                        <span className="text-xs font-mono font-medium text-success">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(adRevenueFromLinkedVideos)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">AdSense</Badge>
                      </div>
                    )}
                    {totalRevenue > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-border">
                        <span className="text-xs font-medium text-muted-foreground">Total Earned</span>
                        <span className="text-sm font-mono font-bold text-success">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* YouTube Linked Videos (via video_companies) */}
              {linkedYTVideos.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
                    <Play className="h-3 w-3" /> Linked YouTube Videos ({linkedYTVideos.length})
                  </h4>
                  <div className="space-y-2">
                    {linkedYTVideos.map((video) => (
                      <div
                        key={video.youtube_video_id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/analytics/videos/${video.youtube_video_id}`)}
                      >
                        <Film className="h-4 w-4 text-destructive shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title ?? video.youtube_video_id}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {video.views > 0 && (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.views)}
                              </span>
                            )}
                            {video.likes > 0 && (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" /> {new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.likes)}
                              </span>
                            )}
                            {video.estimated_revenue > 0 && (
                              <span className="text-xs text-success font-mono">
                                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(video.estimated_revenue)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Queue Videos (legacy) */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
                  <Play className="h-3 w-3" /> Published Videos ({linkedVideos.length})
                </h4>
                {linkedVideos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">No published videos linked</p>
                ) : (
                  <div className="space-y-2">
                    {linkedVideos.map((video: any) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <Film className="h-4 w-4 text-success shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          {video.targetPublishDate && <p className="text-xs text-muted-foreground">{format(new Date(video.targetPublishDate), "MMM d, yyyy")}</p>}
                        </div>
                        <Badge className={cn("text-[10px] capitalize", videoStatusTone[video.status])}>{video.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" /> Content Pipeline ({pipelineIdeas.length})
                </h4>
                {pipelineIdeas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">No pipeline ideas linked</p>
                ) : (
                  <div className="space-y-2">
                    {pipelineIdeas.map((video: any) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <Lightbulb className="h-4 w-4 text-warning shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{video.description || "No description"}</p>
                        </div>
                        <Badge className={cn("text-[10px] capitalize", videoStatusTone[video.status])}>{video.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={company.id} entityType="company" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete} disabled={deleteCompany.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCompany.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CompanyProfilePage() {
  return (
    <WorkspaceProvider>
      <CompanyProfileContent />
    </WorkspaceProvider>
  );
}
