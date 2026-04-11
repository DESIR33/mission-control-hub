import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { ComposeEmailDialog } from "@/components/inbox/ComposeEmailDialog";
import { useUpdateDeal, useDeleteDeal, type Deal } from "@/hooks/use-deals";
import { useActivities } from "@/hooks/use-contacts";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useDealContacts, useLinkDealContact, useUnlinkDealContact } from "@/hooks/use-deal-contacts";
import { LinkContactDialog } from "@/components/projects/LinkContactDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Calendar, Building2, User2, ArrowRightLeft,
  Pencil, Trash2, Loader2, Mail, Film, UserPlus, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const stageConfig: Record<string, { label: string; color: string }> = {
  prospecting: { label: "Prospecting", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  qualification: { label: "Qualification", color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30" },
  proposal: { label: "Proposal", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  negotiation: { label: "Negotiation", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  closed_won: { label: "Closed Won", color: "bg-success/15 text-success border-success/30" },
  closed_lost: { label: "Closed Lost", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export { stageConfig as STAGE_CONFIG };

const forecastLabels: Record<string, string> = {
  pipeline: "Pipeline",
  best_case: "Best Case",
  commit: "Commit",
  closed: "Closed",
};

function DetailRow({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DealDetailSheet({ deal, open, onOpenChange, onDeleted }: DealDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [linkContactOpen, setLinkContactOpen] = useState(false);
  const [stage, setStage] = useState("prospecting");
  const [forecastCategory, setForecastCategory] = useState("");
  const [companyId, setCompanyId] = useState("");

  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: activities = [] } = useActivities(deal?.id ?? null, "deal");
  const { data: videos = [] } = useVideoQueue();
  const { data: dealContacts = [] } = useDealContacts(deal?.id ?? null);
  const linkContact = useLinkDealContact();
  const unlinkContact = useUnlinkDealContact();
  const { toast } = useToast();

  useEffect(() => {
    if (deal) {
      setStage(deal.stage);
      setForecastCategory(deal.forecast_category ?? "");
      setCompanyId(deal.company_id ?? "");
    }
  }, [deal]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!deal) return null;

  const stageInfo = stageConfig[deal.stage] ?? stageConfig.prospecting;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await updateDeal.mutateAsync({
        id: deal.id,
        title: form.get("title") as string,
        value: form.get("value") ? Number(form.get("value")) : null,
        currency: (form.get("currency") as string) || "USD",
        stage,
        forecast_category: forecastCategory && forecastCategory !== "none" ? forecastCategory : null,
        company_id: companyId && companyId !== "none" ? companyId : null,
        expected_close_date: (form.get("expected_close_date") as string) || null,
        notes: (form.get("notes") as string) || null,
      });
      toast({ title: "Deal updated" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeal.mutateAsync(deal.id);
      toast({ title: "Deal deleted" });
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      const updates: Record<string, unknown> = { id: deal.id, stage: newStage };
      if (newStage === "closed_won" || newStage === "closed_lost") {
        updates.closed_at = new Date().toISOString();
      }
      await updateDeal.mutateAsync(updates as any);
      toast({ title: `Stage updated to ${stageConfig[newStage]?.label ?? newStage}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formattedValue = deal.value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency ?? "USD" }).format(deal.value)
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-foreground text-lg">
                  {deal.title}
                </SheetTitle>
                {formattedValue && (
                  <p className="text-sm font-semibold text-muted-foreground">{formattedValue}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(dealContacts.some(dc => dc.contact?.email) || deal.contact?.email) && (
                  <Button variant="ghost" size="icon" onClick={() => setEmailOpen(true)} title="Send email">
                    <Mail className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", stageInfo.color)}>
                {stageInfo.label}
              </Badge>
              {deal.forecast_category && (
                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                  {forecastLabels[deal.forecast_category] ?? deal.forecast_category}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="stage" className="flex-1">Stage</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_title">Title *</Label>
                    <Input id="edit_title" name="title" required defaultValue={deal.title} className="bg-secondary border-border" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_value">Value</Label>
                      <Input id="edit_value" name="value" type="number" step="0.01" min="0" defaultValue={deal.value ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_currency">Currency</Label>
                      <Input id="edit_currency" name="currency" defaultValue={deal.currency ?? "USD"} className="bg-secondary border-border" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Stage</Label>
                      <Select value={stage} onValueChange={setStage}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospecting">Prospecting</SelectItem>
                          <SelectItem value="qualification">Qualification</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Forecast</Label>
                      <Select value={forecastCategory || "none"} onValueChange={setForecastCategory}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="pipeline">Pipeline</SelectItem>
                          <SelectItem value="best_case">Best Case</SelectItem>
                          <SelectItem value="commit">Commit</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_close_date">Expected Close Date</Label>
                    <Input id="edit_close_date" name="expected_close_date" type="date" defaultValue={deal.expected_close_date ?? ""} className="bg-secondary border-border" />
                  </div>

                  <div className="space-y-1.5">
                      <Label>Company</Label>
                      <Select value={companyId || "none"} onValueChange={setCompanyId}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Company</SelectItem>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Contacts</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setLinkContactOpen(true)}>
                        <UserPlus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                    {dealContacts.length === 0 && (
                      <p className="text-xs text-muted-foreground">No contacts linked</p>
                    )}
                    <div className="space-y-1">
                      {dealContacts.map((dc) => (
                        <div key={dc.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary text-sm">
                          <User2 className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">
                            {dc.contact?.first_name} {dc.contact?.last_name ?? ""}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => unlinkContact.mutate({ id: dc.id, dealId: deal.id })}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_deal_notes">Notes</Label>
                    <Textarea id="edit_deal_notes" name="notes" rows={3} defaultValue={deal.notes ?? ""} className="bg-secondary border-border" />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateDeal.isPending}>
                      {updateDeal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deal Info</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={DollarSign} label="Value" value={formattedValue} />
                      <DetailRow icon={Calendar} label="Expected Close" value={deal.expected_close_date ? format(new Date(deal.expected_close_date), "MMM d, yyyy") : null} />
                      {deal.closed_at && (
                        <DetailRow icon={Calendar} label="Closed At" value={format(new Date(deal.closed_at), "MMM d, yyyy")} />
                      )}
                      <DetailRow icon={ArrowRightLeft} label="Forecast" value={deal.forecast_category ? (forecastLabels[deal.forecast_category] ?? deal.forecast_category) : null} />
                    </div>
                  </div>


                  <Separator className="bg-border" />

                  {dealContacts.length > 0 && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts ({dealContacts.length})</h4>
                          <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setLinkContactOpen(true)}>
                            <UserPlus className="w-3 h-3" /> Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {dealContacts.map((dc) => (
                            <div key={dc.id} className="flex items-center gap-2 py-1">
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(dc.contact?.first_name?.[0] || "?").toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{dc.contact?.first_name} {dc.contact?.last_name ?? ""}</p>
                                {dc.contact?.email && <p className="text-xs text-muted-foreground truncate">{dc.contact.email}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator className="bg-border" />
                    </>
                  )}
                  {dealContacts.length === 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">No contacts linked</p>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setLinkContactOpen(true)}>
                        <UserPlus className="w-3 h-3" /> Add Contact
                      </Button>
                    </div>
                  )}

                  {deal.company && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company</h4>
                        <div className="space-y-0.5">
                          <DetailRow icon={Building2} label="Company" value={deal.company.name} />
                        </div>
                      </div>
                      <Separator className="bg-border" />
                    </>
                  )}

                  {deal.notes && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{deal.notes}</p>
                      </div>
                      <Separator className="bg-border" />
                    </>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created: {format(new Date(deal.created_at), "MMM d, yyyy")}</p>
                    <p>Updated: {format(new Date(deal.updated_at), "MMM d, yyyy")}</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ActivityTimeline activities={activities} contactId={deal.id} entityType="deal" />
            </TabsContent>

            <TabsContent value="stage" className="mt-4 space-y-4">
              {/* Stage History */}
              {activities.filter((a) => a.activity_type === "stage_change" || a.activity_type === "status_change").length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage History</h4>
                  <div className="relative pl-4 border-l-2 border-border space-y-3">
                    {activities
                      .filter((a) => a.activity_type === "stage_change" || a.activity_type === "status_change")
                      .map((a) => (
                        <div key={a.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                          <p className="text-sm text-foreground">{a.description || "Stage changed"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to Stage</h4>
              <div className="space-y-2">
                {Object.entries(stageConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleStageChange(key)}
                    disabled={deal.stage === key}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors",
                      deal.stage === key
                        ? "border-primary bg-primary/5 cursor-default"
                        : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", {
                      "bg-blue-500": key === "prospecting",
                      "bg-indigo-500": key === "qualification",
                      "bg-purple-500": key === "proposal",
                      "bg-amber-500": key === "negotiation",
                      "bg-emerald-500": key === "closed_won",
                      "bg-red-500": key === "closed_lost",
                    })} />
                    <span className="text-sm font-medium">{config.label}</span>
                    {deal.stage === key && (
                      <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deal.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDeal.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComposeEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        prefillTo={dealContacts[0]?.contact?.email ?? deal.contact?.email ?? ""}
        prefillSubject={`Re: ${deal.title}`}
        contactId={dealContacts[0]?.contact_id ?? deal.contact_id ?? undefined}
        dealId={deal.id}
      />

      <LinkContactDialog
        open={linkContactOpen}
        onOpenChange={setLinkContactOpen}
        onLink={(contactId) => linkContact.mutate({ dealId: deal.id, contactId })}
        linkedContactIds={dealContacts.map((dc) => dc.contact_id)}
      />
    </>
  );
}
