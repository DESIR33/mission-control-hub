import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useYoutubeLeads,
  useCreateLeadContact,
  useDismissLead,
  useScanForLeads,
  type YouTubeLead,
} from "@/hooks/use-youtube-leads";
import {
  Youtube,
  UserPlus,
  X,
  Loader2,
  Search,
  Inbox,
  Users,
  Video,
} from "lucide-react";

type IntentFilter = "all" | "sponsor" | "collab" | "fan" | "other";

const INTENT_CONFIG: Record<
  string,
  { label: string; color: string; className: string }
> = {
  sponsor: {
    label: "Sponsor",
    color: "purple",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  collab: {
    label: "Collab",
    color: "blue",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  fan: {
    label: "Fan",
    color: "green",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  other: {
    label: "Other",
    color: "gray",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function getIntentConfig(intent: string) {
  return (
    INTENT_CONFIG[intent.toLowerCase()] ??
    INTENT_CONFIG.other
  );
}

function formatSubscriberCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M subs`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K subs`;
  return `${count} subs`;
}

function LeadCard({
  lead,
  onCreateContact,
  onDismiss,
  isCreating,
  isDismissing,
}: {
  lead: YouTubeLead;
  onCreateContact: (lead: YouTubeLead) => void;
  onDismiss: (leadId: string) => void;
  isCreating: boolean;
  isDismissing: boolean;
}) {
  const intentConfig = getIntentConfig(lead.detected_intent);
  const initials = (lead.author_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {lead.author_avatar_url && (
            <AvatarImage src={lead.author_avatar_url} alt={lead.author_name ?? "Avatar"} />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {lead.author_name ?? "Unknown"}
            </span>
            {lead.author_subscriber_count > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatSubscriberCount(lead.author_subscriber_count)}
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border ${intentConfig.className}`}
            >
              {intentConfig.label}
            </Badge>
          </div>

          {lead.video_title && (
            <div className="flex items-center gap-1 mt-0.5">
              <Video className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                {lead.video_title}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        &ldquo;{lead.comment_text}&rdquo;
      </p>

      {lead.processed && (
        <Badge variant="secondary" className="text-[10px]">
          Already converted
        </Badge>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 text-xs h-7"
          disabled={isCreating || lead.processed}
          onClick={() => onCreateContact(lead)}
        >
          {isCreating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserPlus className="w-3 h-3" />
          )}
          Create Contact
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs h-7 text-muted-foreground"
          disabled={isDismissing}
          onClick={() => onDismiss(lead.id)}
        >
          {isDismissing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function YouTubeLeadInbox() {
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useYoutubeLeads();
  const createContact = useCreateLeadContact();
  const dismissLead = useDismissLead();
  const scanForLeads = useScanForLeads();

  const filteredLeads =
    intentFilter === "all"
      ? leads
      : leads.filter(
          (l) => l.detected_intent.toLowerCase() === intentFilter
        );

  const unprocessedCount = leads.filter((l) => !l.processed).length;

  const handleCreateContact = async (lead: YouTubeLead) => {
    setCreatingId(lead.id);
    try {
      await createContact.mutateAsync(lead);
    } finally {
      setCreatingId(null);
    }
  };

  const handleDismiss = async (leadId: string) => {
    setDismissingId(leadId);
    try {
      await dismissLead.mutateAsync(leadId);
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-foreground">
            YouTube Lead Inbox
          </h3>
          {unprocessedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unprocessedCount} new
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={intentFilter}
            onValueChange={(val) => setIntentFilter(val as IntentFilter)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Filter by intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Intents</SelectItem>
              <SelectItem value="sponsor">Sponsor</SelectItem>
              <SelectItem value="collab">Collab</SelectItem>
              <SelectItem value="fan">Fan</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8"
            disabled={scanForLeads.isPending}
            onClick={() => scanForLeads.mutate()}
          >
            {scanForLeads.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Scan for Leads
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            {leads.length === 0
              ? "No leads found yet"
              : "No leads match this filter"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {leads.length === 0
              ? 'Click "Scan for Leads" to analyze your YouTube comments for potential sponsors, collaborators, and engaged fans.'
              : "Try selecting a different intent filter to see more leads."}
          </p>
          {leads.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5 text-xs"
              disabled={scanForLeads.isPending}
              onClick={() => scanForLeads.mutate()}
            >
              {scanForLeads.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Scan for Leads
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary counts */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
            </span>
            {intentFilter === "all" && (
              <>
                {leads.filter((l) => l.detected_intent.toLowerCase() === "sponsor").length > 0 && (
                  <span className="text-purple-600">
                    {leads.filter((l) => l.detected_intent.toLowerCase() === "sponsor").length} sponsor
                  </span>
                )}
                {leads.filter((l) => l.detected_intent.toLowerCase() === "collab").length > 0 && (
                  <span className="text-blue-600">
                    {leads.filter((l) => l.detected_intent.toLowerCase() === "collab").length} collab
                  </span>
                )}
                {leads.filter((l) => l.detected_intent.toLowerCase() === "fan").length > 0 && (
                  <span className="text-green-600">
                    {leads.filter((l) => l.detected_intent.toLowerCase() === "fan").length} fan
                  </span>
                )}
              </>
            )}
          </div>

          {/* Lead Cards */}
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onCreateContact={handleCreateContact}
              onDismiss={handleDismiss}
              isCreating={creatingId === lead.id}
              isDismissing={dismissingId === lead.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
