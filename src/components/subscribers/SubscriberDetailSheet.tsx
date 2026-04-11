import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateSubscriber, useDeleteSubscriber } from "@/hooks/use-subscribers";
import { useSubscriberSequences, useEnrollSubscriber } from "@/hooks/use-subscriber-sequences";
import { useToast } from "@/hooks/use-toast";
import { Mail, MapPin, BookOpen, Video, Calendar, Pencil, Trash2, Loader2, ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subscriber, SubscriberStatus } from "@/types/subscriber";
import { SubscriberEngagementBadge } from "./SubscriberEngagementBadge";
import { SubscriberTagPicker } from "./SubscriberTagPicker";
import { PromoteSubscriberDialog } from "./PromoteSubscriberDialog";
import { SubscriberGuidePicker } from "./SubscriberGuidePicker";
import { useNavigate } from "react-router-dom";
import { safeFormat } from "@/lib/date-utils";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  unsubscribed: "bg-destructive/15 text-destructive border-destructive/30",
  bounced: "bg-warning/15 text-warning border-warning/30",
};

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

interface SubscriberDetailSheetProps {
  subscriber: Subscriber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function SubscriberDetailSheet({ subscriber, open, onOpenChange, onDeleted }: SubscriberDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState<string>("active");
  const [enrollSequenceId, setEnrollSequenceId] = useState<string>("");

  const updateSubscriber = useUpdateSubscriber();
  const deleteSubscriber = useDeleteSubscriber();
  const { data: sequences = [] } = useSubscriberSequences();
  const enrollSubscriber = useEnrollSubscriber();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (subscriber) setStatus(subscriber.status);
  }, [subscriber]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!subscriber) return null;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await updateSubscriber.mutateAsync({
        id: subscriber.id,
        email: form.get("email") as string,
        first_name: (form.get("first_name") as string) || undefined,
        last_name: (form.get("last_name") as string) || undefined,
        status: status as SubscriberStatus,
        source_video_id: (form.get("source_video_id") as string) || undefined,
        source_video_title: (form.get("source_video_title") as string) || undefined,
        guide_requested: (form.get("guide_requested") as string) || undefined,
        city: (form.get("city") as string) || undefined,
        state: (form.get("state") as string) || undefined,
        country: (form.get("country") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Subscriber updated" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubscriber.mutateAsync(subscriber.id);
      toast({ title: "Subscriber removed" });
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEnroll = async () => {
    if (!enrollSequenceId) return;
    try {
      await enrollSubscriber.mutateAsync({ sequenceId: enrollSequenceId, subscriberId: subscriber.id });
      toast({ title: "Enrolled in sequence" });
      setEnrollSequenceId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const location = [subscriber.city, subscriber.state, subscriber.country].filter(Boolean).join(", ");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => { onOpenChange(false); navigate(`/subscribers/${subscriber.id}`); }}
              >
                <span className="text-lg font-bold text-primary">
                  {(subscriber.first_name ?? subscriber.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle
                  className="text-foreground text-lg cursor-pointer hover:text-primary transition-colors"
                  onClick={() => { onOpenChange(false); navigate(`/subscribers/${subscriber.id}`); }}
                >
                  {subscriber.first_name ? `${subscriber.first_name} ${subscriber.last_name ?? ""}`.trim() : subscriber.email}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{subscriber.email}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", statusColors[subscriber.status])}>
                {subscriber.status}
              </Badge>
              <SubscriberEngagementBadge score={subscriber.engagement_score} />
              {subscriber.opt_in_confirmed && (
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                  Confirmed
                </Badge>
              )}
            </div>
            {/* Actions row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <SubscriberTagPicker subscriberId={subscriber.id} />
              <PromoteSubscriberDialog subscriber={subscriber} />
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="engagement" className="flex-1">Engagement</TabsTrigger>
              <TabsTrigger value="sequences" className="flex-1">Sequences</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_first_name">First Name</Label>
                      <Input id="edit_first_name" name="first_name" defaultValue={subscriber.first_name ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_last_name">Last Name</Label>
                      <Input id="edit_last_name" name="last_name" defaultValue={subscriber.last_name ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_email">Email *</Label>
                    <Input id="edit_email" name="email" type="email" required defaultValue={subscriber.email} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Source Video ID</Label>
                      <Input name="source_video_id" defaultValue={subscriber.source_video_id ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Source Video Title</Label>
                      <Input name="source_video_title" defaultValue={subscriber.source_video_title ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guide Requested</Label>
                    <Input name="guide_requested" defaultValue={subscriber.guide_requested ?? ""} className="bg-secondary border-border" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input name="city" defaultValue={subscriber.city ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Input name="state" defaultValue={subscriber.state ?? ""} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input name="country" defaultValue={subscriber.country ?? ""} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea name="notes" rows={3} defaultValue={subscriber.notes ?? ""} className="bg-secondary border-border" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateSubscriber.isPending}>
                      {updateSubscriber.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={Mail} label="Email" value={subscriber.email} href={`mailto:${subscriber.email}`} />
                      {location && <DetailRow icon={MapPin} label="Location" value={location} />}
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source</h4>
                    <div className="space-y-0.5">
                      <DetailRow icon={Video} label="Source" value={subscriber.source} />
                      <DetailRow icon={Video} label="Source Video" value={subscriber.source_video_title ?? subscriber.source_video_id} />
                      <DetailRow icon={BookOpen} label="Guide Requested" value={subscriber.guide_requested} />
                      {subscriber.guide_delivered_at && (
                        <DetailRow icon={Calendar} label="Guide Delivered" value={safeFormat(subscriber.guide_delivered_at, "MMM d, yyyy")} />
                      )}
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  <SubscriberGuidePicker subscriberId={subscriber.id} />
                  {subscriber.notes && (
                    <>
                      <Separator className="bg-border" />
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{subscriber.notes}</p>
                      </div>
                    </>
                  )}
                  {subscriber.promoted_to_contact_id && (
                    <>
                      <Separator className="bg-border" />
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary">Promoted to Contact</span>
                      </div>
                    </>
                  )}
                  <Separator className="bg-border" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Subscribed: {safeFormat(subscriber.created_at, "MMM d, yyyy")}</p>
                    <p>Updated: {safeFormat(subscriber.updated_at, "MMM d, yyyy")}</p>
                    {subscriber.opt_in_confirmed_at && (
                      <p>Opt-in confirmed: {safeFormat(subscriber.opt_in_confirmed_at, "MMM d, yyyy")}</p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="engagement" className="mt-4 space-y-4">
              {/* Rate cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {(subscriber.engagement_data.open_rate ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Click Rate (CTR)</p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {(subscriber.engagement_data.click_rate ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>
              {/* Absolute counts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Emails Sent</p>
                  <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.emails_sent}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Unique Opens</p>
                  <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.unique_opens ?? subscriber.engagement_data.emails_opened}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Unique Clicks</p>
                  <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.unique_clicks ?? subscriber.engagement_data.emails_clicked}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Guides Downloaded</p>
                  <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.guides_downloaded}</p>
                </div>
              </div>
              {/* Beehiiv metadata */}
              {subscriber.beehiiv_tier && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Beehiiv Tier</p>
                  <Badge variant="outline" className="capitalize">{subscriber.beehiiv_tier}</Badge>
                </div>
              )}
              {/* Engagement score bar */}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Engagement Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        subscriber.engagement_score >= 75 ? "bg-destructive" :
                        subscriber.engagement_score >= 50 ? "bg-warning" :
                        subscriber.engagement_score >= 25 ? "bg-primary" : "bg-muted-foreground"
                      )}
                      style={{ width: `${Math.min(subscriber.engagement_score, 100)}%` }}
                    />
                  </div>
                  <SubscriberEngagementBadge score={subscriber.engagement_score} />
                </div>
              </div>
              {subscriber.engagement_data.last_email_opened_at && (
                <p className="text-xs text-muted-foreground">
                  Last email opened: {safeFormat(subscriber.engagement_data.last_email_opened_at, "MMM d, yyyy")}
                </p>
              )}
              {subscriber.engagement_data.last_clicked_at && (
                <p className="text-xs text-muted-foreground">
                  Last link clicked: {safeFormat(subscriber.engagement_data.last_clicked_at, "MMM d, yyyy")}
                </p>
              )}
            </TabsContent>

            <TabsContent value="sequences" className="mt-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Enroll in Sequence</h4>
                {sequences.filter((s) => s.status === "active").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active sequences available.</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={enrollSequenceId} onValueChange={setEnrollSequenceId}>
                      <SelectTrigger className="flex-1 bg-secondary border-border">
                        <SelectValue placeholder="Select a sequence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sequences.filter((s) => s.status === "active").map((seq) => (
                          <SelectItem key={seq.id} value={seq.id}>
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              {seq.name} ({seq.steps.length} steps)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleEnroll} disabled={!enrollSequenceId || enrollSubscriber.isPending}>
                      {enrollSubscriber.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enroll"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {subscriber.first_name ?? subscriber.email} from your subscriber list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteSubscriber.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteSubscriber.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}