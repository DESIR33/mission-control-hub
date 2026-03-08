import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { differenceInDays, differenceInHours, format } from "date-fns";
import {
  Radar, Clock, AlertTriangle, User, Crown, Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const { data: items = [], isLoading } = useQuery<FollowUpItem[]>({
    queryKey: ["follow-up-radar", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get unread emails not in trash/spam
      const { data: emails } = await supabase
        .from("inbox_emails")
        .select("id, subject, from_name, from_email, received_at, is_read, ai_category")
        .eq("workspace_id", workspaceId)
        .eq("is_read", false)
        .not("folder", "in", '("trash","spam","sent")')
        .order("received_at", { ascending: false })
        .limit(50);

      if (!emails?.length) return [];

      // Get contacts for VIP matching
      const emailAddresses = emails.map(e => e.from_email);
      const { data: contacts } = await supabase
        .from("contacts")
        .select("email, vip_tier")
        .eq("workspace_id", workspaceId)
        .in("email", emailAddresses);

      // Get active deals
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
    refetchInterval: 60000,
  });

  const urgencyColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/30",
    high: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Radar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Follow-Up Radar</h3>
        {items.filter(i => i.urgency === "critical").length > 0 && (
          <Badge variant="destructive" className="ml-auto text-[10px]">
            {items.filter(i => i.urgency === "critical").length} critical
          </Badge>
        )}
      </div>
      <ScrollArea className="h-[350px]">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Scanning inbox…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            All caught up! No follow-ups needed.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
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
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
