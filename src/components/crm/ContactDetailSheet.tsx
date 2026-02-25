import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ActivityTimeline } from "./ActivityTimeline";
import { Mail, Phone, Globe, Linkedin, Twitter, Instagram, MessageSquare, Building2, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, Activity } from "@/types/crm";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const tierLabels: Record<string, { label: string; color: string }> = {
  none: { label: "—", color: "" },
  silver: { label: "🥈 Silver", color: "text-muted-foreground" },
  gold: { label: "🥇 Gold", color: "text-warning" },
  platinum: { label: "💎 Platinum", color: "text-primary" },
};

interface ContactDetailSheetProps {
  contact: Contact | null;
  activities: Activity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
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

export function ContactDetailSheet({ contact, activities, open, onOpenChange }: ContactDetailSheetProps) {
  if (!contact) return null;

  const tier = tierLabels[contact.vip_tier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
              </span>
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-foreground text-lg">
                {contact.first_name} {contact.last_name}
              </SheetTitle>
              {contact.role && (
                <p className="text-sm text-muted-foreground">{contact.role}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", statusColors[contact.status])}>
              {contact.status}
            </Badge>
            {contact.vip_tier !== "none" && (
              <span className={cn("text-xs", tier.color)}>{tier.label}</span>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="enrichment" className="flex-1">Enrichment</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Contact Info */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
              <div className="space-y-0.5">
                <DetailRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                <DetailRow icon={Phone} label="Phone" value={contact.phone} />
                <DetailRow icon={Globe} label="Website" value={contact.website} href={contact.website ?? undefined} />
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Company */}
            {contact.company && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company</h4>
                  <div className="space-y-0.5">
                    <DetailRow icon={Building2} label="Company" value={contact.company.name} />
                    <DetailRow icon={Globe} label="Industry" value={contact.company.industry} />
                    <DetailRow icon={Globe} label="Website" value={contact.company.website} href={contact.company.website ?? undefined} />
                  </div>
                </div>
                <Separator className="bg-border" />
              </>
            )}

            {/* Social */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social</h4>
              <div className="space-y-0.5">
                <DetailRow icon={Twitter} label="Twitter / X" value={contact.social_twitter} href={contact.social_twitter ? `https://x.com/${contact.social_twitter.replace("@", "")}` : undefined} />
                <DetailRow icon={Linkedin} label="LinkedIn" value={contact.social_linkedin} href={contact.social_linkedin ? `https://linkedin.com/in/${contact.social_linkedin}` : undefined} />
                <DetailRow icon={Instagram} label="Instagram" value={contact.social_instagram} href={contact.social_instagram ? `https://instagram.com/${contact.social_instagram.replace("@", "")}` : undefined} />
                <DetailRow icon={MessageSquare} label="WhatsApp" value={contact.social_whatsapp} />
              </div>
            </div>

            <Separator className="bg-border" />

            {/* SLA & Preferences */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">SLA & Preferences</h4>
              <div className="space-y-0.5">
                <DetailRow icon={Clock} label="Response SLA" value={contact.response_sla_minutes ? `${contact.response_sla_minutes} min` : null} />
                <DetailRow icon={Shield} label="Preferred Channel" value={contact.preferred_channel} />
              </div>
            </div>

            {/* Notes */}
            {contact.notes && (
              <>
                <Separator className="bg-border" />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </>
            )}

            {/* Meta */}
            <Separator className="bg-border" />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p>Created: {format(new Date(contact.created_at), "MMM d, yyyy")}</p>
              <p>Updated: {format(new Date(contact.updated_at), "MMM d, yyyy")}</p>
              {contact.source && <p>Source: {contact.source}</p>}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ActivityTimeline activities={activities} />
          </TabsContent>

          <TabsContent value="enrichment" className="mt-4">
            {contact.enrichment_ai ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</h4>
                <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
                  {JSON.stringify(contact.enrichment_ai, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No enrichment data available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
