import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useInboxFeedback } from "@/hooks/use-inbox-feedback";
import {
  HeartPulse, TrendingUp, TrendingDown, Minus, MessageSquare,
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
import { safeGetTime } from "@/lib/date-utils";

interface ContactSentiment {
  email: string;
  name: string;
  totalEmails: number;
  categories: Record<string, number>;
  lastContact: string;
  trend: "warming" | "stable" | "cooling" | "stale";
  daysSinceLastReply: number;
}

export function ConversationIntelligence() {
  const { workspaceId } = useWorkspace();
  const { excludedEmails, submitFeedback, removeFeedback, feedbackList } = useInboxFeedback();

  const { data: contacts = [], isLoading } = useQuery<ContactSentiment[]>({
    queryKey: ["conversation-intelligence", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: emails } = await supabase
        .from("inbox_emails")
        .select("from_email, from_name, ai_category, received_at")
        .eq("workspace_id", workspaceId)
        .not("folder", "in", '("trash","spam")')
        .order("received_at", { ascending: false })
        .limit(500);

      if (!emails?.length) return [];

      const grouped = new Map<string, { name: string; emails: any[] }>();
      emails.forEach(e => {
        if (!grouped.has(e.from_email)) {
          grouped.set(e.from_email, { name: e.from_name, emails: [] });
        }
        grouped.get(e.from_email)!.emails.push(e);
      });

      const now = new Date();
      return Array.from(grouped.entries())
        .filter(([_, v]) => v.emails.length >= 2)
        .map(([email, { name, emails: contactEmails }]) => {
          const categories: Record<string, number> = {};
          contactEmails.forEach((e: any) => {
            const cat = (e as any).ai_category || "uncategorized";
            categories[cat] = (categories[cat] || 0) + 1;
          });

          const sorted = contactEmails.sort((a: any, b: any) => safeGetTime(b.received_at) - safeGetTime(a.received_at));
          const daysSinceLastReply = Math.floor((now.getTime() - safeGetTime(sorted[0].received_at)) / (1000 * 60 * 60 * 24));

          const recentCount = sorted.filter((e: any) => {
            const d = Math.floor((now.getTime() - safeGetTime(e.received_at)) / (1000 * 60 * 60 * 24));
            return d <= 14;
          }).length;
          const olderCount = sorted.filter((e: any) => {
            const d = Math.floor((now.getTime() - safeGetTime(e.received_at)) / (1000 * 60 * 60 * 24));
            return d > 14 && d <= 28;
          }).length;

          let trend: ContactSentiment["trend"] = "stable";
          if (daysSinceLastReply > 30) trend = "stale";
          else if (recentCount > olderCount * 1.5) trend = "warming";
          else if (recentCount < olderCount * 0.5) trend = "cooling";

          return {
            email, name: name || email,
            totalEmails: contactEmails.length,
            categories,
            lastContact: sorted[0].received_at,
            trend,
            daysSinceLastReply,
          };
        })
        .sort((a, b) => {
          const trendOrder = { stale: 0, cooling: 1, stable: 2, warming: 3 };
          return trendOrder[a.trend] - trendOrder[b.trend];
        })
        .slice(0, 20);
    },
    enabled: !!workspaceId,
  });

  // Filter out excluded emails
  const filteredContacts = contacts.filter(c => !excludedEmails.has(c.email));

  const trendConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    warming: { icon: TrendingUp, color: "text-green-500", label: "Warming Up" },
    stable: { icon: Minus, color: "text-muted-foreground", label: "Stable" },
    cooling: { icon: TrendingDown, color: "text-amber-500", label: "Cooling Down" },
    stale: { icon: TrendingDown, color: "text-red-500", label: "Stale" },
  };

  const getExistingFeedback = (email: string) =>
    feedbackList.find(f => f.email_address === email && f.source === "conversation_intelligence");

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <HeartPulse className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Conversation Intelligence</h3>
        {filteredContacts.filter(c => c.trend === "stale" || c.trend === "cooling").length > 0 && (
          <Badge variant="destructive" className="ml-auto text-[10px]">
            {filteredContacts.filter(c => c.trend === "stale" || c.trend === "cooling").length} need attention
          </Badge>
        )}
      </div>
      <ScrollArea className="h-[350px]">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Analyzing conversations…</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Not enough email data to analyze.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredContacts.map(c => {
              const tc = trendConfig[c.trend];
              const TrendIcon = tc.icon;
              const existing = getExistingFeedback(c.email);
              return (
                <ContextMenu key={c.email}>
                  <ContextMenuTrigger asChild>
                    <div className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-default">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.email}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${tc.color} shrink-0`}>
                          <TrendIcon className="w-3 h-3" />
                          {tc.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {c.totalEmails} emails
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Last: {c.daysSinceLastReply}d ago
                        </span>
                        {Object.entries(c.categories).map(([cat, count]) => (
                          <Badge key={cat} variant="secondary" className="text-[9px] h-4">{cat}: {count}</Badge>
                        ))}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: c.email, feedback_type: "irrelevant", source: "conversation_intelligence" },
                          { onSuccess: () => toast.success(`Marked ${c.name} as irrelevant`) }
                        );
                      }}
                    >
                      <Ban className="w-4 h-4 mr-2 text-muted-foreground" />
                      Mark as Irrelevant
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: c.email, feedback_type: "marketing", source: "conversation_intelligence" },
                          { onSuccess: () => toast.success(`Marked ${c.name} as marketing`) }
                        );
                      }}
                    >
                      <Megaphone className="w-4 h-4 mr-2 text-muted-foreground" />
                      Mark as Marketing
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        submitFeedback.mutate(
                          { email_address: c.email, feedback_type: "spam", source: "conversation_intelligence" },
                          { onSuccess: () => toast.success(`Marked ${c.name} as spam`) }
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
                          { email_address: c.email, feedback_type: "useful", source: "conversation_intelligence" },
                          { onSuccess: () => toast.success(`Marked ${c.name} as useful`) }
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
                              { email_address: c.email, source: "conversation_intelligence" },
                              { onSuccess: () => toast.success(`Removed feedback for ${c.name}`) }
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
