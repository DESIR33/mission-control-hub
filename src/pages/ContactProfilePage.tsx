import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
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
import { useContacts, useDeleteContact, useActivities } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useSmartInbox } from "@/hooks/use-smart-inbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Globe,
  Phone,
  MapPin,
  User,
  Building2,
  DollarSign,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  Handshake,
  MessageSquare,
  Calendar,
  ExternalLink,
  Shield,
  Star,
  Send,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Facebook,
} from "lucide-react";
import type { Contact } from "@/types/crm";

const tierConfig: Record<string, { label: string; icon: typeof Star; color: string }> = {
  none: { label: "No Tier", icon: Star, color: "" },
  silver: { label: "🥈 Silver", icon: Shield, color: "text-muted-foreground" },
  gold: { label: "🥇 Gold", icon: Star, color: "text-warning" },
  platinum: { label: "💎 Platinum", icon: Shield, color: "text-primary" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success/15 text-success border-success/30" },
  lead: { label: "Lead", color: "bg-primary/15 text-primary border-primary/30" },
  customer: { label: "Customer", color: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  inactive: { label: "Inactive", color: "bg-muted text-muted-foreground border-border" },
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

export default function ContactProfilePage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: contacts = [], isLoading } = useContacts();
  const contact = contacts.find((c) => c.id === contactId) ?? null;

  const { data: activities = [] } = useActivities(contactId ?? null, "contact");
  const { data: allDeals = [] } = useDeals();
  const { data: emails = [] } = useSmartInbox("inbox", contact?.email ?? "");

  const deleteContact = useDeleteContact();

  // Deals linked to this contact
  const contactDeals = useMemo(() => {
    if (!contact) return [];
    return allDeals.filter((d) => d.contact_id === contact.id);
  }, [allDeals, contact]);

  const dealRevenue = useMemo(
    () => contactDeals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (d.value ?? 0), 0),
    [contactDeals],
  );

  // Emails matched by sender address
  const contactEmails = useMemo(() => {
    if (!contact?.email) return [];
    return emails.filter(
      (e) => e.from_email?.toLowerCase() === contact.email?.toLowerCase(),
    );
  }, [emails, contact]);

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

  const initials = contact
    ? `${contact.first_name[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase()
    : "";

  const fullName = contact
    ? `${contact.first_name} ${contact.last_name ?? ""}`.trim()
    : "";

  const hasSocials = contact && (
    contact.social_twitter || contact.social_linkedin || contact.social_youtube ||
    contact.social_instagram || contact.social_facebook || contact.social_telegram || contact.social_whatsapp
  );

  if (isLoading) {
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

  if (!contact) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate("/network/contacts")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
        </Button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Contact Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">This contact may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[contact.status] ?? statusConfig.lead;
  const tier = tierConfig[contact.vip_tier] ?? tierConfig.none;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/network/contacts")} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
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

        {/* Avatar & Name overlay */}
        <div className="relative px-4 sm:px-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          {contact.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={fullName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{initials}</span>
            </div>
          )}

          {/* Name & meta */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", status.color)}>
                {status.label}
              </Badge>
              {contact.vip_tier !== "none" && (
                <span className={cn("text-xs font-medium", tier.color)}>{tier.label}</span>
              )}
              {contact.role && (
                <span className="text-sm text-muted-foreground">{contact.role}</span>
              )}
              {contact.company && (
                <button
                  onClick={() => navigate(`/relationships/companies/${contact.company!.id}`)}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {contact.company.name}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 pb-1">
            {contact.email && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:${contact.email}`}>
                  <Send className="w-3.5 h-3.5" /> Email
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Edit coming soon" })} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
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
            <SocialLink icon={Twitter} value={contact.social_twitter} baseUrl="https://x.com/" />
            <SocialLink icon={Linkedin} value={contact.social_linkedin} baseUrl="https://linkedin.com/in/" />
            <SocialLink icon={Youtube} value={contact.social_youtube} baseUrl="https://youtube.com/@" />
            <SocialLink icon={Instagram} value={contact.social_instagram} baseUrl="https://instagram.com/" />
            <SocialLink icon={Facebook} value={contact.social_facebook} baseUrl="https://facebook.com/" />
          </div>
        )}
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Deals",
            value: String(contactDeals.length),
            icon: Handshake,
          },
          {
            label: "Revenue",
            value: dealRevenue > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(dealRevenue)
              : "$0",
            icon: DollarSign,
          },
          {
            label: "Emails",
            value: String(contactEmails.length),
            icon: Mail,
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

      {/* Main content: sidebar + tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar — Contact Info */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <DetailRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
              <DetailRow icon={Phone} label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              <DetailRow icon={Globe} label="Website" value={contact.website} href={contact.website ?? undefined} />
              <DetailRow icon={MessageSquare} label="Preferred Channel" value={contact.preferred_channel} />
              {contact.response_sla_minutes && (
                <DetailRow icon={Clock} label="Response SLA" value={`${contact.response_sla_minutes} min`} />
              )}
              <DetailRow icon={User} label="Source" value={contact.source} />
            </CardContent>
          </Card>

          {/* Location */}
          {(contact.city || contact.state || contact.country) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 py-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">
                    {[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company */}
          {contact.company && (
            <Card
              className="bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/relationships/companies/${contact.company!.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {contact.company.logo_url ? (
                    <img src={contact.company.logo_url} alt={contact.company.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contact.company.name}</p>
                    {contact.company.industry && (
                      <p className="text-xs text-muted-foreground">{contact.company.industry}</p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Enrichment Data */}
          {(contact.enrichment_hunter || contact.enrichment_ai || contact.enrichment_youtube) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrichment Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.enrichment_youtube && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">YouTube</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(contact.enrichment_youtube, null, 2)}
                    </pre>
                  </div>
                )}
                {contact.enrichment_hunter && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hunter</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(contact.enrichment_hunter, null, 2)}
                    </pre>
                  </div>
                )}
                {contact.enrichment_ai && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">AI</p>
                    <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(contact.enrichment_ai, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Created: {format(new Date(contact.created_at), "MMM d, yyyy")}</p>
            <p>Updated: {format(new Date(contact.updated_at), "MMM d, yyyy")}</p>
            {contact.last_contact_date && (
              <p>Last Contact: {formatDistanceToNow(new Date(contact.last_contact_date), { addSuffix: true })}</p>
            )}
          </div>
        </div>

        {/* Main content tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="emails">
            <TabsList>
              <TabsTrigger value="emails">Emails ({contactEmails.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({contactDeals.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-4 space-y-2">
              {contactEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  <Mail className="w-8 h-8 mb-3 text-muted-foreground/50" />
                  <p>No emails found from this contact</p>
                  {!contact.email && <p className="text-xs mt-1">Add an email address to see conversations</p>}
                </div>
              ) : (
                contactEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate("/inbox")}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 shrink-0",
                      email.is_read ? "bg-muted-foreground/30" : "bg-primary"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{email.subject || "(No subject)"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{email.preview}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </span>
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
                        {deal.expected_close_date && (
                          <p className="text-xs text-muted-foreground">
                            Expected: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-mono font-medium",
                        deal.stage === "closed_won" ? "text-success" : "text-muted-foreground"
                      )}>
                        {deal.value != null
                          ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value)
                          : "$0"}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {deal.stage.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                  {dealRevenue > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border px-1">
                      <span className="text-xs font-medium text-muted-foreground">Total Won Revenue</span>
                      <span className="text-sm font-mono font-bold text-success">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dealRevenue)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={contact.id} entityType="contact" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fullName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteContact.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
