import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, } from "date-fns";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CompanyIntelFeed } from "@/components/companies/CompanyIntelFeed";
import { AssociateContactPopover } from "@/components/crm/AssociateContactPopover";
import { AgencyClientsPanel } from "@/components/companies/AgencyClientsPanel";

import { useCompanies, useDeleteCompany, useCompanyContacts } from "@/hooks/use-companies";
import { useActivities } from "@/hooks/use-contacts";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useDeals } from "@/hooks/use-deals";
import { useCompanyLinkedVideos } from "@/hooks/use-company-videos";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { InboxEmail } from "@/hooks/use-smart-inbox";
import {
  ArrowLeft,
  Mail,
  Globe,
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
  Handshake,
  Calendar,
  Phone,
  Briefcase,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Facebook,
} from "lucide-react";
import type { Company, Contact } from "@/types/crm";
import { safeFormat, safeFormatDistanceToNow } from "@/lib/date-utils";
import { EmailActions } from "@/components/company/EmailActions";

const tierConfig: Record<string, { label: string; color: string }> = {
  none: { label: "", color: "" },
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
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
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

function SocialLink({ icon: Icon, value, baseUrl }: { icon: typeof Twitter; value: string | null | undefined; baseUrl: string }) {
  if (!value) return null;
  const handle = value.replace("@", "").replace(/https?:\/\/(www\.)?[^/]+\/?/, "");
  const url = value.startsWith("http") ? value : `${baseUrl}${handle}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}

export default function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const [isEnriching, setIsEnriching] = useState(false);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const company = companies.find((c) => c.id === companyId) ?? null;

  const { data: companyContacts = [] } = useCompanyContacts(companyId ?? null);
  const { data: activities = [] } = useActivities(companyId ?? null, "company");
  const { data: allVideos = [] } = useVideoQueue();
  const { data: allDeals = [] } = useDeals();
  const { data: linkedYTVideos = [] } = useCompanyLinkedVideos(companyId);
  const deleteCompany = useDeleteCompany();

  // Fetch emails from linked contacts
  const contactEmails = useMemo(
    () => companyContacts.map((c) => c.email).filter(Boolean) as string[],
    [companyContacts]
  );

  const { data: companyEmails = [] } = useQuery({
    queryKey: ["company-emails", companyId, contactEmails],
    queryFn: async (): Promise<InboxEmail[]> => {
      if (!workspaceId || contactEmails.length === 0) return [];
      const { data, error } = await supabase
        .from("inbox_emails" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("from_email", contactEmails)
        .order("received_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!workspaceId && contactEmails.length > 0,
  });

  // Filter videos from video_queue linked to this company
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
  const relationshipAge = company ? differenceInDays(new Date(), new Date(company.created_at)) : 0;

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

    return { totalRevenue, revenuePerVideo, winRate, closedDeals, wonDeals: wonDeals.length, pipelineValue, openDeals: openDeals.length, totalCollabs: companyVideos.length, score, grade, gradeColor };
  }, [company, companyDeals, companyVideos, linkedVideos, totalRevenue, companyContacts]);

  const handleDelete = async () => {
    if (!company) return;
    try {
      await deleteCompany.mutateAsync(company.id);
      toast({ title: "Company deleted" });
      navigate("/network/companies");
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

  const tier = company ? tierConfig[company.vip_tier] : null;
  const hasEnrichment = company && (company.enrichment_brandfetch || company.enrichment_clay || company.enrichment_firecrawl);

  const hasSocials = company && (
    company.social_twitter || company.social_linkedin || company.social_youtube ||
    company.social_instagram || company.social_facebook || company.social_tiktok
  );

  const initials = company?.name ? company.name.slice(0, 2).toUpperCase() : "";

  if (companiesLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen space-y-6">
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
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate("/network/companies")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
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
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/network/companies")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Companies
      </Button>

      {/* Profile Header — social-media style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mb-8"
      >
        {/* Banner */}
        <div className="h-28 sm:h-36 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/40 to-accent/20 border border-border" />

        {/* Logo & Name overlay */}
        <div className="relative px-4 sm:px-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Logo */}
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
          )}

          {/* Name & meta */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {company.is_agency && (
                <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary gap-1">
                  <Briefcase className="w-3 h-3" />
                  Agency
                </Badge>
              )}
              {company.industry && (
                <Badge variant="outline" className="text-xs">
                  {company.industry}
                </Badge>
              )}
              {tier && company.vip_tier !== "none" && (
                <span className={cn("text-xs font-medium", tier.color)}>{tier.label}</span>
              )}
              {company.size && (
                <span className="text-sm text-muted-foreground">{company.size} employees</span>
              )}
              {totalRevenue > 0 && (
                <Badge variant="outline" className="text-xs border-success/30 bg-success/10 text-success">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalRevenue)} revenue
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 pb-1">
            <Button variant="outline" size="sm" onClick={handleEnrich} disabled={isEnriching} className="gap-1.5">
              {isEnriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isEnriching ? "Enriching..." : "Enrich"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/relationships/companies/${company.id}/edit`)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Social links row */}
        {hasSocials && (
          <div className="flex items-center gap-2 px-4 sm:px-6 mt-4">
            <SocialLink icon={Twitter} value={company.social_twitter} baseUrl="https://x.com/" />
            <SocialLink icon={Linkedin} value={company.social_linkedin} baseUrl="https://linkedin.com/company/" />
            <SocialLink icon={Youtube} value={company.social_youtube} baseUrl="https://youtube.com/@" />
            <SocialLink icon={Instagram} value={company.social_instagram} baseUrl="https://instagram.com/" />
            <SocialLink icon={Facebook} value={company.social_facebook} baseUrl="https://facebook.com/" />
          </div>
        )}
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          {
            label: "Revenue",
            value: totalRevenue > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(totalRevenue)
              : "$0",
            icon: DollarSign,
          },
          {
            label: "Deals",
            value: String(companyDeals.length),
            icon: Handshake,
          },
          {
            label: "Contacts",
            value: String(companyContacts.length),
            icon: Users,
          },
          {
            label: "Videos",
            value: String(companyVideos.length + linkedYTVideos.length),
            icon: Film,
          },
          {
            label: "Win Rate",
            value: scorecard && scorecard.closedDeals > 0 ? `${Math.round(scorecard.winRate * 100)}%` : "--",
            icon: BarChart3,
          },
          {
            label: "Rel. Age",
            value: relationshipAge >= 365
              ? `${(relationshipAge / 365).toFixed(1)}y`
              : relationshipAge >= 30
                ? `${Math.round(relationshipAge / 30)}mo`
                : `${relationshipAge}d`,
            icon: Calendar,
          },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold font-mono text-foreground truncate">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partnership Scorecard */}
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
                { val: String(scorecard.openDeals), label: "Open Deals" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-secondary/30 border border-border px-3 py-2.5 text-center">
                  <p className="text-sm font-bold text-foreground font-mono">{item.val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
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
              <DetailRow icon={Phone} label="Phone" value={company.phone} href={company.phone ? `tel:${company.phone}` : undefined} />
              <DetailRow icon={DollarSign} label="Revenue" value={company.revenue} />
              {company.response_sla_minutes && (
                <DetailRow icon={Clock} label="Response SLA" value={`${company.response_sla_minutes} min`} />
              )}
            </CardContent>
          </Card>

          {/* Location */}
          {(company.city || company.state || company.country || company.location) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 py-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">
                    {company.location || [company.city, company.state, company.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Agency / Client Links */}
          <AgencyClientsPanel companyId={company.id} isAgency={company.is_agency} />

          {hasEnrichment && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrichment Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.enrichment_brandfetch && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Brandfetch</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(company.enrichment_brandfetch, null, 2)}
                    </pre>
                  </div>
                )}
                {company.enrichment_clay && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Clay</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(company.enrichment_clay, null, 2)}
                    </pre>
                  </div>
                )}
                {company.enrichment_firecrawl && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Firecrawl</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(company.enrichment_firecrawl, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Created: {safeFormat(company.created_at, "MMM d, yyyy")}</p>
            <p>Updated: {safeFormat(company.updated_at, "MMM d, yyyy")}</p>
            {company.last_contact_date && (
              <p>Last Contact: {safeFormatDistanceToNow(company.last_contact_date, { addSuffix: true })}</p>
            )}
          </div>
        </div>

        {/* Main content tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contacts">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="contacts">Contacts ({companyContacts.length})</TabsTrigger>
              <TabsTrigger value="emails">Emails ({companyEmails.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({companyVideos.length + linkedYTVideos.length})</TabsTrigger>
              <TabsTrigger value="intel">Intel</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Associated Contacts</h4>
                <AssociateContactPopover companyId={company.id} existingContactIds={companyContacts.map((c) => c.id)} />
              </div>
              {companyContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <Users className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No contacts associated with this company</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {companyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
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
                      <Badge variant="outline" className={cn("text-xs uppercase tracking-wider shrink-0", statusColors[contact.status])}>
                        {contact.status}
                      </Badge>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-4 space-y-2">
              {companyEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <Mail className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No emails from linked contacts</p>
                  {companyContacts.length === 0 && (
                    <p className="text-xs mt-1">Associate contacts to see their emails here</p>
                  )}
                </div>
              ) : (
                companyEmails.map((email: any) => (
                  <div
                    key={email.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer",
                      !email.is_read && "border-primary/30 bg-primary/5"
                    )}
                    onClick={() => navigate("/inbox")}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !email.is_read ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {email.from_name || email.from_email}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {safeFormat(email.received_at, "MMM d")}
                        </span>
                      </div>
                      <p className={cn("text-sm truncate", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{email.preview}</p>
                    </div>
                    {email.has_attachments && (
                      <Badge variant="outline" className="text-xs shrink-0">📎</Badge>
                    )}
                    <EmailActions
                      email={email}
                      companyId={company.id}
                      companyName={company.name}
                      companyLogo={company.logo_url}
                    />
                  </div>
                ))
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
                        <Badge variant="outline" className="text-xs capitalize">{deal.stage.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                    {adRevenueFromLinkedVideos > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground">YouTube Ad Revenue ({linkedYTVideos.length} videos)</span>
                        <span className="text-xs font-mono font-medium text-success">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(adRevenueFromLinkedVideos)}
                        </span>
                        <Badge variant="outline" className="text-xs">AdSense</Badge>
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

              {/* YouTube Linked Videos */}
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
                          <p className="text-sm font-medium text-foreground truncate">{video.title ?? "Untitled Video"}</p>
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

              {/* Video Queue Videos */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
                  <Play className="h-3 w-3" /> Published Videos ({linkedVideos.length})
                </h4>
                {linkedVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    <Film className="w-8 h-8 mb-3 text-muted-foreground/50" />
                    <p>No published videos linked</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedVideos.map((video: any) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <Film className="h-4 w-4 text-success shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          {video.targetPublishDate && <p className="text-xs text-muted-foreground">{safeFormat(video.targetPublishDate, "MMM d, yyyy")}</p>}
                        </div>
                        <Badge className={cn("text-xs capitalize", videoStatusTone[video.status])}>{video.status}</Badge>
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
                  <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    <Lightbulb className="w-8 h-8 mb-3 text-muted-foreground/50" />
                    <p>No pipeline ideas linked</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pipelineIdeas.map((video: any) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <Lightbulb className="h-4 w-4 text-warning shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{video.description || "No description"}</p>
                        </div>
                        <Badge className={cn("text-xs capitalize", videoStatusTone[video.status])}>{video.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Intel Tab */}
            <TabsContent value="intel" className="mt-4">
              <CompanyIntelFeed companyId={company.id} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={company.id} entityType="company" />
            </TabsContent>
          </Tabs>
        </div>
      </div>


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
