import { useParams, useNavigate } from "react-router-dom";
import { useSubscriber, useUpdateSubscriber, useDeleteSubscriber } from "@/hooks/use-subscribers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriberEngagementBadge } from "@/components/subscribers/SubscriberEngagementBadge";
import { ArrowLeft, Mail, MapPin, BookOpen, Video, Calendar, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/network/contacts?tab=subscribers")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Subscribers
      </Button>

      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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
            <div className="flex items-center gap-2 mt-2">
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
        </div>

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
      </div>
    </div>
  );
}
