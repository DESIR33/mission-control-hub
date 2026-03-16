import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubscriber, useUpdateSubscriber, useDeleteSubscriber } from "@/hooks/use-subscribers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SubscriberEngagementBadge } from "@/components/subscribers/SubscriberEngagementBadge";
import { SubscriberTagPicker } from "@/components/subscribers/SubscriberTagPicker";
import { PromoteSubscriberDialog } from "@/components/subscribers/PromoteSubscriberDialog";
import { ArrowLeft, Mail, MapPin, BookOpen, Video, Calendar, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SubscriberStatus } from "@/types/subscriber";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  unsubscribed: "bg-destructive/15 text-destructive border-destructive/30",
  bounced: "bg-warning/15 text-warning border-warning/30",
};

export default function SubscriberProfilePage() {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const navigate = useNavigate();
  const { data: subscriber, isLoading } = useSubscriber(subscriberId ?? null);
  const updateSubscriber = useUpdateSubscriber();
  const deleteSubscriber = useDeleteSubscriber();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState<string>("active");

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">Subscriber not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/network/contacts?tab=subscribers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subscribers
        </Button>
      </div>
    );
  }

  const location = [subscriber.city, subscriber.state, subscriber.country].filter(Boolean).join(", ");

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
      navigate("/network/contacts?tab=subscribers");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/network/contacts?tab=subscribers")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Subscribers
      </Button>

      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {(subscriber.first_name ?? subscriber.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              {subscriber.first_name ? `${subscriber.first_name} ${subscriber.last_name ?? ""}`.trim() : subscriber.email}
            </h1>
            <p className="text-sm text-muted-foreground">{subscriber.email}</p>
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
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SubscriberTagPicker subscriberId={subscriber.id} />
            <PromoteSubscriberDialog subscriber={subscriber} />
            <Button variant="ghost" size="icon" onClick={() => { setEditing(!editing); setStatus(subscriber.status); }}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input name="first_name" defaultValue={subscriber.first_name ?? ""} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input name="last_name" defaultValue={subscriber.last_name ?? ""} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input name="email" type="email" required defaultValue={subscriber.email} className="bg-secondary border-border" />
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
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Source</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Source:</span>
                    <span className="text-foreground capitalize">{subscriber.source ?? "—"}</span>
                  </div>
                  {subscriber.source_video_title && (
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Video:</span>
                      <span className="text-foreground">{subscriber.source_video_title}</span>
                    </div>
                  )}
                  {subscriber.guide_requested && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Guide:</span>
                      <span className="text-foreground">{subscriber.guide_requested}</span>
                    </div>
                  )}
                  {subscriber.guide_delivered_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Delivered:</span>
                      <span className="text-foreground">{format(new Date(subscriber.guide_delivered_at), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-foreground">{location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Engagement</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground">Emails Sent</p>
                    <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.emails_sent}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground">Emails Opened</p>
                    <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.emails_opened}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground">Clicked</p>
                    <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.emails_clicked}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground">Guides</p>
                    <p className="text-lg font-bold font-mono text-foreground">{subscriber.engagement_data.guides_downloaded}</p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
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
              </div>
            </div>

            {/* Notes */}
            {subscriber.notes && (
              <div className="rounded-lg border border-border bg-card p-4 mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{subscriber.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div className="mt-6 text-xs text-muted-foreground space-y-1">
              <p>Subscribed: {format(new Date(subscriber.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              <p>Last updated: {format(new Date(subscriber.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </>
        )}
      </div>

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
    </div>
  );
}