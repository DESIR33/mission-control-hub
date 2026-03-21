import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";
import { useInboxFeedback } from "@/hooks/use-inbox-feedback";
import { differenceInHours } from "date-fns";
import {
  Radar, Clock, User, Crown,
  Ban, Megaphone, ThumbsUp, Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";

interface FollowUpItem {
  id: string;
  subject: string;
  from_name: string;
  from_email: string;
  received_at: string;
  hours_ago: number;
  urgency: "critical" | "high" | "medium" | "low";
  vip_tier: string | null;
  has_deal: boolean;
  deal_title: string | null;
}

export function FollowUpRadar() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();
  const { excludedEmails, submitFeedback, removeFeedback, feedbackList } = useInboxFeedback();

  const { data: items = [], isLoading } = useQuery<FollowUpItem[]>({
    queryKey: ["follow-up-radar", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: emails } = await supabase
        .from("inbox_emails")
        .select("id, subject, from_name, from_email, received_at, is_read, ai_category")
        .eq("workspace_id", workspaceId)
        .eq("is_read", false)
        .not("folder", "in", '("trash","spam","sent")')
        .order("received_at", { ascending: false })
        .limit(50);

      if (!emails?.length) return [];

      const emailAddresses = emails.map(e => e.from_email);
      const { data: contacts } = await supabase
        .from("contacts")
        .select("email, vip_tier")
        .eq("workspace_id", workspaceId)
        .in("email", emailAddresses);

      const { data: deals } = await supabase
        .from("deals")
        .select("title, contact_id, contacts!deals_contact_id_fkey(email)")
        .eq("workspace_id", workspaceId)
        .not("stage", "in", '("closed_won","closed_lost")');

      const contactMap = new Map((contacts || []).map(c => [c.email, c.vip_tier]));
      const dealMap = new Map<string, string>();
      (deals || []).forEach((d: any) => {
        if (d.contacts?.email) dealMap.set(d.contacts.email, d.title);
      });

      const now = new Date();
      return emails.map(e => {
        const hoursAgo = differenceInHours(now, new Date(e.received_at));
        const vipTier = contactMap.get(e.from_email) || null;
        const dealTitle = dealMap.get(e.from_email) || null;
        const isOpportunity = (e as any).ai_category === "opportunity";

        let urgency: FollowUpItem["urgency"] = "low";
        if (hoursAgo > 48 && (vipTier === "platinum" || vipTier === "gold" || isOpportunity)) urgency = "critical";
        else if (hoursAgo > 48 || (vipTier && vipTier !== "none")) urgency = "high";
        else if (hoursAgo > 24 || dealTitle) urgency = "medium";

        return {
          id: e.id, subject: e.subject, from_name: e.from_name, from_email: e.from_email,
          received_at: e.received_at, hours_ago: hoursAgo, urgency, vip_tier: vipTier,
          has_deal: !!dealTitle, deal_title: dealTitle,
        };
      })
        .sort((a, b) => {
          const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.hours_ago - a.hours_ago;
        })
        .slice(0, 20);
    },
    enabled: !!workspaceId,
    ...getFreshness("followUpRadar"),
  });

  // Filter out excluded emails
  const filteredItems = items.filter(i => !excludedEmails.has(i.from_email));

  const urgencyColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/30",
    high: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    low: "bg-muted text-muted-foreground",
  };

  const getExistingFeedback = (email: string) =>
    feedbackList.find(f => f.email_address === email && f.source === "follow_up_radar");

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Radar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Follow-Up Radar</h3>
        {filteredItems.filter(i => i.urgency === "critical").length > 0 && (
          <Badge variant="destructive" className="ml-auto text-[10px]">
            {filteredItems.filter(i => i.urgency === "critical").length} critical
          </Badge>
        )}
      </div>
      <ScrollArea className="h-[350px]">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Scanning inbox…</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            All caught up! No follow-ups needed.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map(item => {
              const existing = getExistingFeedback(item.from_email);
              return (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-default">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className={`text-[9px] shrink-0 mt-0.5 ${urgencyColors[item.urgency]}`}>
                          {item.urgency}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.subject || "(No subject)"}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5" />
                            {item.from_name || item.from_email}
                            {item.vip_tier && item.vip_tier !== "none" && (
                              <Crown className="w-2.5 h-2.5 text-amber-500" />
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {item.hours_ago < 24 ? `${item.hours_ago}h ago` : `${Math.floor(item.hours_ago / 24)}d ago`}
                            </span>
                            {item.has_deal && (
                              <Badge variant="secondary" className="text-[9px] h-4">Deal: {item.deal_title}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: item.from_email, feedback_type: "irrelevant", source: "follow_up_radar" },
                          { onSuccess: () => toast.success(`Marked ${item.from_name || item.from_email} as irrelevant`) }
                        );
                      }}
                    >
                      <Ban className="w-4 h-4 mr-2 text-muted-foreground" />
                      Mark as Irrelevant
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: item.from_email, feedback_type: "marketing", source: "follow_up_radar" },
                          { onSuccess: () => toast.success(`Marked ${item.from_name || item.from_email} as marketing`) }
                        );
                      }}
                    >
                      <Megaphone className="w-4 h-4 mr-2 text-muted-foreground" />
                      Mark as Marketing
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: item.from_email, feedback_type: "spam", source: "follow_up_radar" },
                          { onSuccess: () => toast.success(`Marked ${item.from_name || item.from_email} as spam`) }
                        );
                      }}
                    >
                      <Ban className="w-4 h-4 mr-2 text-destructive" />
                      Mark as Spam
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: item.from_email, feedback_type: "useful", source: "follow_up_radar" },
                          { onSuccess: () => toast.success(`Marked ${item.from_name || item.from_email} as useful`) }
                        );
                      }}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2 text-green-500" />
                      Mark as Useful
                    </ContextMenuItem>
                    {existing && existing.feedback_type !== "useful" && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            removeFeedback.mutate(
                              { email_address: item.from_email, source: "follow_up_radar" },
                              { onSuccess: () => toast.success(`Removed feedback for ${item.from_name || item.from_email}`) }
                            );
                          }}
                        >
                          <Undo2 className="w-4 h-4 mr-2 text-muted-foreground" />
                          Undo Feedback
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
