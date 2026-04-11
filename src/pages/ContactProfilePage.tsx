import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays, , isPast, isToday, isBefore, addDays } from "date-fns";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { useContacts, useDeleteContact, useActivities } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useSmartInbox } from "@/hooks/use-smart-inbox";
import { useContactInteractions, useCreateContactInteraction, useContactTags, useCreateContactTag, useDeleteContactTag, useContactEmails } from "@/hooks/use-contact-details";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Mail, Globe, Phone, MapPin, User, Building2, DollarSign, Clock,
  Pencil, Trash2, Loader2, Handshake, MessageSquare, Calendar, ExternalLink,
  Shield, Star, Send, Linkedin, Twitter, Instagram, Youtube, Facebook,
  Plus, X, ArrowUpRight, ArrowDownLeft, Tag, Flame, Target, Github,
} from "lucide-react";
import type { Contact } from "@/types/crm";
import { safeFormat, safeFormatDistanceToNow } from "@/lib/date-utils";

const warmthConfig: Record<string, { label: string; color: string; icon: typeof Flame }> = {
  cold: { label: "Cold", color: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: Star },
  warming: { label: "Warming", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: Flame },
  warm: { label: "Warm", color: "bg-orange-500/15 text-orange-500 border-orange-500/30", icon: Flame },
  hot: { label: "Hot", color: "bg-destructive/15 text-destructive border-destructive/30", icon: Flame },
  active: { label: "Active", color: "bg-success/15 text-success border-success/30", icon: Target },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success/15 text-success border-success/30" },
  lead: { label: "Lead", color: "bg-primary/15 text-primary border-primary/30" },
  customer: { label: "Customer", color: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  inactive: { label: "Inactive", color: "bg-muted text-muted-foreground border-border" },
  inbound_lead: { label: "Inbound Lead", color: "bg-primary/15 text-primary border-primary/30" },
  qualified: { label: "Qualified", color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  in_conversation: { label: "In Conversation", color: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  negotiating: { label: "Negotiating", color: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  active_sponsor: { label: "Active Sponsor", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  past_sponsor: { label: "Past Sponsor", color: "bg-teal-500/15 text-teal-500 border-teal-500/30" },
  churned: { label: "Churned", color: "bg-destructive/15 text-destructive border-destructive/30" },
  not_a_fit: { label: "Not a Fit", color: "bg-muted text-muted-foreground border-border" },
};

const INTERACTION_TYPES = [
  "email_sent", "email_received", "linkedin_dm", "twitter_dm",
  "whatsapp", "call", "meeting", "video_comment", "other",
];

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">{value}</a>
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
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
      <Icon className="w-4 h-4" />
    </a>
  );
}

function LeadScoreRing({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? "stroke-emerald-500" : pct >= 40 ? "stroke-yellow-500" : "stroke-destructive";
  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" className="stroke-border" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" className={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-foreground">{score}</span>
    </div>
  );
}

export default function ContactProfilePage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { data: contacts = [], isLoading } = useContacts();
  const contact = contacts.find((c) => c.id === contactId) ?? null;

  const { data: activities = [] } = useActivities(contactId ?? null, "contact");
  const { data: allDeals = [] } = useDeals();
  const { data: interactions = [] } = useContactInteractions(contactId ?? null);
  const { data: tags = [] } = useContactTags(contactId ?? null);
  const { data: contactLinkedEmails = [] } = useContactEmails(contactId ?? null);
  const createInteraction = useCreateContactInteraction();
  const createTag = useCreateContactTag();
  const deleteTag = useDeleteContactTag();
  const deleteContact = useDeleteContact();

  // Legacy email matching
  const { data: emails = [] } = useSmartInbox("inbox", contact?.email ?? "");
  const contactEmails = useMemo(() => {
    if (!contact?.email) return contactLinkedEmails;
    // Merge linked emails with email-matched ones, deduplicate by id
    const ids = new Set(contactLinkedEmails.map((e: any) => e.id));
    const fromMatch = emails.filter((e) => e.from_email?.toLowerCase() === contact.email?.toLowerCase() && !ids.has(e.id));
    return [...contactLinkedEmails, ...fromMatch].sort((a: any, b: any) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }, [emails, contact, contactLinkedEmails]);

  const contactDeals = useMemo(() => {
    if (!contact) return [];
    return allDeals.filter((d) => d.contact_id === contact.id);
  }, [allDeals, contact]);

  const dealRevenue = useMemo(
    () => contactDeals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (d.value ?? 0), 0),
    [contactDeals],
  );

  const relationshipAge = contact ? differenceInDays(new Date(), new Date(contact.created_at)) : 0;

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      toast({ title: "Contact deleted" });
      navigate("/network/contacts");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contact) return;
    const fd = new FormData(e.currentTarget);
    try {
      await createInteraction.mutateAsync({
        contact_id: contact.id,
        interaction_type: fd.get("interaction_type") as string,
        direction: fd.get("direction") as string,
        subject: (fd.get("subject") as string) || null,
        notes: (fd.get("notes") as string) || null,
        email_id: null,
        deal_id: null,
        interaction_date: new Date().toISOString(),
      });
      toast({ title: "Interaction logged" });
      setInteractionOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddTag = async () => {
    if (!contact || !tagInput.trim()) return;
    try {
      await createTag.mutateAsync({ contact_id: contact.id, tag: tagInput.trim() });
      setTagInput("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const initials = contact ? `${contact.first_name[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase() : "";
  const fullName = contact ? `${contact.first_name} ${contact.last_name ?? ""}`.trim() : "";

  const hasSocials = contact && (
    contact.social_twitter || contact.social_linkedin || contact.social_youtube ||
    contact.social_instagram || contact.social_facebook || contact.social_telegram ||
    contact.social_whatsapp || contact.social_github
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-64" /><Skeleton className="h-96 lg:col-span-2" /></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate("/network/contacts")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
        </Button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Contact Not Found</h2>
        </div>
      </div>
    );
  }

  const status = statusConfig[contact.status] ?? statusConfig.lead;
  const warmth = warmthConfig[contact.warmth ?? "cold"] ?? warmthConfig.cold;

  // Follow-up urgency
  const followUpUrgency = contact.next_follow_up_date
    ? isPast(new Date(contact.next_follow_up_date)) ? "overdue"
    : isToday(new Date(contact.next_follow_up_date)) ? "today"
    : isBefore(new Date(contact.next_follow_up_date), addDays(new Date(), 7)) ? "soon"
    : "later"
    : null;

  const followUpColors: Record<string, string> = {
    overdue: "text-destructive",
    today: "text-orange-500",
    soon: "text-yellow-500",
    later: "text-muted-foreground",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <Button variant="ghost" size="sm" onClick={() => navigate("/network/contacts")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </Button>

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative mb-8">
        <div className="h-28 sm:h-36 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/40 to-accent/20 border border-border" />
        <div className="relative px-4 sm:px-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt={fullName} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-background shadow-lg" />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{initials}</span>
            </div>
          )}

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{fullName}</h1>
              {contact.lead_score != null && <LeadScoreRing score={contact.lead_score} />}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", status.color)}>{status.label}</Badge>
              <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", warmth.color)}>{warmth.label}</Badge>
              {contact.is_decision_maker && (
                <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30">🏆 Decision Maker</Badge>
              )}
              {contact.job_title && <span className="text-sm text-muted-foreground">{contact.job_title}</span>}
              {contact.company && (
                <button onClick={() => navigate(`/relationships/companies/${contact.company!.id}`)} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />{contact.company.name}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pb-1">
            {contact.email && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:${contact.email}`}><Send className="w-3.5 h-3.5" /> Email</a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setInteractionOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Log
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/contacts/${contact.id}/edit`)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {hasSocials && (
          <div className="flex items-center gap-2 px-4 sm:px-6 mt-4">
            <SocialLink icon={Twitter} value={contact.social_twitter} baseUrl="https://x.com/" />
            <SocialLink icon={Linkedin} value={contact.social_linkedin} baseUrl="https://linkedin.com/in/" />
            <SocialLink icon={Youtube} value={contact.social_youtube} baseUrl="https://youtube.com/@" />
            <SocialLink icon={Instagram} value={contact.social_instagram} baseUrl="https://instagram.com/" />
            <SocialLink icon={Facebook} value={contact.social_facebook} baseUrl="https://facebook.com/" />
            <SocialLink icon={Github} value={contact.social_github} baseUrl="https://github.com/" />
          </div>
        )}
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Deals", value: String(contactDeals.length), icon: Handshake },
          { label: "Revenue", value: dealRevenue > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(dealRevenue) : "$0", icon: DollarSign },
          { label: "Emails", value: String(contactEmails.length), icon: Mail },
          { label: "Outreach", value: String(contact.outreach_count ?? 0), icon: Send },
          { label: "Rel. Age", value: relationshipAge >= 365 ? `${(relationshipAge / 365).toFixed(1)}y` : relationshipAge >= 30 ? `${Math.round(relationshipAge / 30)}mo` : `${relationshipAge}d`, icon: Calendar },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-0.5">
              <DetailRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
              {contact.secondary_email && <DetailRow icon={Mail} label="Secondary Email" value={contact.secondary_email} href={`mailto:${contact.secondary_email}`} />}
              <DetailRow icon={Phone} label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              <DetailRow icon={Globe} label="Website" value={contact.website} href={contact.website ?? undefined} />
              <DetailRow icon={MessageSquare} label="Channel" value={contact.preferred_channel} />
              <DetailRow icon={Clock} label="Timezone" value={contact.timezone} />
              <DetailRow icon={User} label="Source" value={contact.source} />
              {contact.source_detail && <DetailRow icon={User} label="Source Detail" value={contact.source_detail} />}
              {contact.referral_source && <DetailRow icon={User} label="Referral" value={contact.referral_source} />}
              <DetailRow icon={User} label="Type" value={contact.contact_type?.replace(/_/g, " ")} />
              <DetailRow icon={User} label="Department" value={contact.department} />
              {contact.reports_to && <DetailRow icon={User} label="Reports To" value={contact.reports_to} />}
            </CardContent>
          </Card>

          {(contact.city || contact.state || contact.country) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 py-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outreach & Follow-up */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outreach & Follow-up</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {contact.last_outreach_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Outreach</span>
                  <span className="text-foreground">{safeFormatDistanceToNow(contact.last_outreach_date, { addSuffix: true })}</span>
                </div>
              )}
              {contact.last_response_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Response</span>
                  <span className="text-foreground">{safeFormatDistanceToNow(contact.last_response_date, { addSuffix: true })}</span>
                </div>
              )}
              {contact.next_follow_up_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Follow-up</span>
                  <span className={cn("font-medium", followUpColors[followUpUrgency ?? "later"])}>
                    {followUpUrgency === "overdue" ? "Overdue" : followUpUrgency === "today" ? "Due Today" : safeFormat(contact.next_follow_up_date, "MMM d")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Outreach Count</span>
                <span className="font-mono text-foreground">{contact.outreach_count ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Sponsor Details */}
          {(contact.contact_type === "sponsor_lead" || contact.typical_budget_range || contact.preferred_deal_type) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sponsor Details</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {contact.typical_budget_range && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget Range</span>
                    <Badge variant="outline" className="text-xs">{contact.typical_budget_range}</Badge>
                  </div>
                )}
                {contact.preferred_deal_type && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deal Type</span>
                    <span className="text-foreground capitalize">{contact.preferred_deal_type.replace(/_/g, " ")}</span>
                  </div>
                )}
                {contact.payment_terms && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Terms</span>
                    <span className="text-foreground capitalize">{contact.payment_terms.replace(/_/g, " ")}</span>
                  </div>
                )}
                {dealRevenue > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
                    <span className="text-muted-foreground font-medium">Total Won</span>
                    <span className="text-success font-mono font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dealRevenue)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t: any) => (
                  <Badge key={t.id} variant="outline" className="text-xs gap-1 pr-1">
                    {t.tag}
                    <button onClick={() => deleteTag.mutate({ id: t.id, contactId: contact.id })} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
              </div>
              <div className="flex gap-1.5">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag…" className="bg-secondary border-border h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }} />
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleAddTag} disabled={!tagInput.trim()}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {contact.notes && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p></CardContent>
            </Card>
          )}

          {contact.company && (
            <Card className="bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/relationships/companies/${contact.company!.id}`)}>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {contact.company.logo_url ? (
                    <img src={contact.company.logo_url} alt={contact.company.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contact.company.name}</p>
                    {contact.company.industry && <p className="text-xs text-muted-foreground">{contact.company.industry}</p>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Created: {safeFormat(contact.created_at, "MMM d, yyyy")}</p>
            <p>Updated: {safeFormat(contact.updated_at, "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Main content tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="interactions">Interactions ({interactions.length})</TabsTrigger>
              <TabsTrigger value="emails">Emails ({contactEmails.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({contactDeals.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="mt-4 space-y-2">
              <Button variant="outline" size="sm" onClick={() => setInteractionOpen(true)} className="gap-1.5 mb-2">
                <Plus className="w-3.5 h-3.5" /> Log Interaction
              </Button>
              {interactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <MessageSquare className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No interactions logged yet</p>
                </div>
              ) : (
                interactions.map((i: any) => (
                  <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      i.direction === "outbound" ? "bg-primary/10" : "bg-success/10")}>
                      {i.direction === "outbound" ? <ArrowUpRight className="w-4 h-4 text-primary" /> : <ArrowDownLeft className="w-4 h-4 text-success" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{i.interaction_type.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-muted-foreground">{safeFormatDistanceToNow(i.interaction_date, { addSuffix: true })}</span>
                      </div>
                      {i.subject && <p className="text-sm text-foreground mt-1">{i.subject}</p>}
                      {i.notes && <p className="text-xs text-muted-foreground mt-0.5">{i.notes}</p>}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-4 space-y-2">
              {contactEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <Mail className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No emails found from this contact</p>
                </div>
              ) : (
                contactEmails.map((email: any) => (
                  <div key={email.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate("/inbox")}>
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", email.is_read ? "bg-muted-foreground/30" : "bg-primary")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{email.subject || "(No subject)"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{email.preview}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{safeFormatDistanceToNow(email.received_at, { addSuffix: true })}</span>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Deals Tab */}
            <TabsContent value="deals" className="mt-4 space-y-2">
              {contactDeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <Handshake className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No deals linked to this contact</p>
                </div>
              ) : (
                <>
                  {contactDeals.map((deal) => (
                    <div key={deal.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                        {deal.expected_close_date && <p className="text-xs text-muted-foreground">Expected: {safeFormat(deal.expected_close_date, "MMM d, yyyy")}</p>}
                      </div>
                      <span className={cn("text-xs font-mono font-medium", deal.stage === "closed_won" ? "text-success" : "text-muted-foreground")}>
                        {deal.value != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value) : "$0"}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">{deal.stage.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                  {dealRevenue > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border px-1">
                      <span className="text-xs font-medium text-muted-foreground">Total Won Revenue</span>
                      <span className="text-sm font-mono font-bold text-success">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dealRevenue)}</span>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={contact.id} entityType="contact" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Log Interaction Dialog */}
      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
          <form onSubmit={handleLogInteraction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select name="interaction_type" defaultValue="email_sent">
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="hidden" name="interaction_type" />
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select name="direction" defaultValue="outbound">
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">↗ Outbound</SelectItem>
                    <SelectItem value="inbound">↙ Inbound</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="direction" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input name="subject" placeholder="Brief description…" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} className="bg-secondary border-border" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setInteractionOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createInteraction.isPending}>
                {createInteraction.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Log
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {fullName}. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteContact.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteContact.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
