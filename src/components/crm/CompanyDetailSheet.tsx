import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Globe, Linkedin, Twitter, Instagram, MapPin, Building2,
  Users, DollarSign, Clock, Pencil, Trash2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company, Activity, Contact } from "@/types/crm";
import { format } from "date-fns";

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

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export function CompanyDetailSheet({ company, activities, companyContacts, open, onOpenChange, onEdit, onDeleted }: CompanyDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
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
                <Badge variant="outline" className="text-[10px]">{company.size} employees</Badge>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">
                Contacts ({companyContacts.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="enrichment" className="flex-1">Enrichment</TabsTrigger>
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

              {/* Meta */}
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>Created: {format(new Date(company.created_at), "MMM d, yyyy")}</p>
                <p>Updated: {format(new Date(company.updated_at), "MMM d, yyyy")}</p>
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
                        className={cn("text-[10px] uppercase tracking-wider shrink-0", statusColors[contact.status])}
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

            <TabsContent value="enrichment" className="mt-4 space-y-4">
              {hasEnrichment ? (
                <>
                  {company.enrichment_brandfetch && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brandfetch</h4>
                      <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
                        {JSON.stringify(company.enrichment_brandfetch, null, 2)}
                      </pre>
                    </div>
                  )}
                  {company.enrichment_clay && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clay</h4>
                      <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
                        {JSON.stringify(company.enrichment_clay, null, 2)}
                      </pre>
                    </div>
                  )}
                  {company.enrichment_firecrawl && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Firecrawl</h4>
                      <pre className="text-xs text-foreground bg-secondary/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
                        {JSON.stringify(company.enrichment_firecrawl, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  No enrichment data available
                </div>
              )}
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
