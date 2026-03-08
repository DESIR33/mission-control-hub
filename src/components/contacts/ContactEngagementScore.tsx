import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Clock, Mail, Handshake } from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

interface ScoredContact {
  id: string;
  name: string;
  score: number;
  recency: number;
  dealActivity: number;
  emailActivity: number;
  tier: "hot" | "warm" | "cool" | "cold";
}

export function ContactEngagementScore() {
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const { workspaceId } = useWorkspace();

  const { data: activities = [] } = useQuery({
    queryKey: ["contact-engagement-activities", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("activities")
        .select("entity_id, activity_type, performed_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "contact")
        .gte("performed_at", new Date(Date.now() - 90 * 86400000).toISOString())
        .limit(500);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const scored: ScoredContact[] = contacts.slice(0, 50).map((contact) => {
    // Recency score (0-30): last contact date
    const lastContact = contact.last_contact_date
      ? new Date(contact.last_contact_date)
      : null;
    const daysSince = lastContact
      ? Math.floor((Date.now() - lastContact.getTime()) / 86400000)
      : 999;
    const recency = daysSince <= 3 ? 30 : daysSince <= 7 ? 25 : daysSince <= 14 ? 20 : daysSince <= 30 ? 15 : daysSince <= 60 ? 8 : 0;

    // Deal activity (0-35)
    const contactDeals = deals.filter((d) => d.contact_id === contact.id);
    const activeDeals = contactDeals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage));
    const dealActivity = Math.min(35, activeDeals.length * 15 + contactDeals.length * 5);

    // Email/activity count (0-25)
    const contactActivities = activities.filter((a) => a.entity_id === contact.id);
    const emailActivity = Math.min(25, contactActivities.length * 5);

    // VIP bonus (0-10)
    const vipBonus = contact.vip_tier === "platinum" ? 10 : contact.vip_tier === "gold" ? 7 : contact.vip_tier === "silver" ? 4 : 0;

    const score = Math.min(100, recency + dealActivity + emailActivity + vipBonus);
    const tier: ScoredContact["tier"] =
      score >= 75 ? "hot" : score >= 50 ? "warm" : score >= 25 ? "cool" : "cold";

    return {
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      score,
      recency,
      dealActivity,
      emailActivity,
      tier,
    };
  }).sort((a, b) => b.score - a.score);

  const tierColors = {
    hot: "destructive",
    warm: "default",
    cool: "secondary",
    cold: "outline",
  } as const;

  const tierIcons = {
    hot: <Flame className="h-3 w-3" />,
    warm: <Mail className="h-3 w-3" />,
    cool: <Clock className="h-3 w-3" />,
    cold: <Clock className="h-3 w-3" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-primary" />
          Contact Engagement Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {scored.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No contacts found</p>
          ) : (
            scored.slice(0, 15).map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{c.name}</span>
                    <Badge variant={tierColors[c.tier]} className="text-xs gap-1">
                      {tierIcons[c.tier]}
                      {c.tier}
                    </Badge>
                  </div>
                  <Progress value={c.score} className="h-1.5 mt-1.5" />
                </div>
                <span className="text-lg font-bold text-foreground w-10 text-right">{c.score}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
